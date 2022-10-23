import WebSocket, { WebSocketServer } from 'ws';
import * as http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { filter, Subscription } from "rxjs";
import chalk from 'chalk';


// mine
import { ISocketDocument } from "../documents/ISocketDocument"
import { Topic } from '../documents/Topic';
import { IBackendApi } from '../public';
import { BackendContainer } from './BackendContainer';
import { getFrakasJson } from '../documents/FrakasJson';
import { createLocalHost } from './LocalHost';

export class BackendSocket {

    private _connections: { [name: string]: WebSocket } = {};
    private _container: BackendContainer;

    constructor(private _noHost: boolean, private _remoteHost: boolean) {

        this._container = new BackendContainer();
        this._initWebsocket();
    }

    public getBackendApi(): IBackendApi {
        return this._container.getBackendApi();
    }

    private async _initWebsocket() {
        try {
            var config = getFrakasJson();

            console.logD("frakas.config, contents: ", config);

            if(isNaN(+config.webPort)){
                console.logE(chalk.red("webPort not set to valid number in frakas.json, exiting"));
                return;
            }

            const server = http.createServer();

            const wss = new WebSocketServer({
                server: server
            });

            if(!this._noHost) {
                console.logD("Creating localhost")
                var app = await createLocalHost(this._remoteHost);
                server.on('request', app)
            }

            server.on('connect', (req, clientSocket, head) => {
                // Connect to an origin server
                console.logD(`Connect event http://${req.url}`);
            });

            server.on('stream', (stream, headers) => {
                
            });

            server.on('error', (err) => console.error(err));

            server.listen(config.webPort, function () {

                console.logI(`http/ws server listening on ${config.webPort}`);
            });

            wss.on('connection', (ws) => {
                try {
                    var connectionId = uuidv4();

                    this._connections[connectionId] = ws;

                    this._startGame(connectionId, ws);
                    this._startPlayerEvent(connectionId, ws);

                    ws.on('message', async (event) => {
                        try {

                            var doc = JSON.parse(event.toString()) as ISocketDocument

                            switch (doc.topic) {
                                case Topic.ping:
                                    ws.send(JSON.stringify(<ISocketDocument>{ topic: Topic.ping, content: `Pong ${doc.content}` }));
                                    break;
                                case Topic.playerEnter:
                                    this._playerEnter(connectionId, doc);
                                    break;
                                case Topic.playerExit:
                                    this._playerExit(connectionId, doc);
                                    break;
                                case Topic.playerEvent:
                                    this._playerEventIn(connectionId, doc);
                                    break;
                                case Topic.metrics:
                                    break;
                            }
                        } catch (ex: any) {
                            console.logE(ex);
                        }
                    });

                    ws.on('close', (event) => {

                        console.logD(`Close Event connectionId:${connectionId}`, event);

                        this._playerExit(connectionId, <ISocketDocument>{})

                        delete this._connections[connectionId];

                    });

                } catch (ex: any) {
                    console.logE(ex);
                }
            });

            console.logI(chalk.blue(`:Starting ws server on port ${config.webPort}`));

        } catch (ex: any) {
            console.logE(ex);
            throw ex;
        }
    }

    private _startGame(connectionId: string, ws: WebSocket) {
        try {
            console.logD(`:StartGame called connectionId: ${connectionId}`);

            this._container?.startGame.call(this._container);

            return this._container?.sendToAllObservable()
                .subscribe({
                    next: content => {
                        var contentStr = JSON.stringify(content);
                        ws.send(JSON.stringify(<ISocketDocument>{ topic: Topic.publicEvent, content: contentStr }));

                    },
                    error: ex => {
                        console.logE(ex);
                        console.logD(`Error Loop Ending`);
                    },
                    complete: () => {
                        console.logD(`Loop Ending`);
                    }
                });

        } catch (ex: any) {
            console.logE(ex);
        }

        return undefined;
    }

    private _startPlayerEvent(connectionId: string, ws: WebSocket) {
        try {

            console.logI(`:StartPlayerEvent called. connectionId:${connectionId}`);

            return this._container?.sendToPlayerObservable.call(this._container)
                .pipe(filter(message => {
                    var res = message.connectionId == connectionId;
                    return res;
                }))
                .subscribe({
                    next: message => {
                        var contentStr = JSON.stringify(message.state);
                        ws.send(JSON.stringify(<ISocketDocument>{ topic: Topic.privateEvent, content: contentStr }));
                    },
                    error: ex => {
                        console.logE(ex);
                        console.logD(`Error User event Loop Ending`);
                    },
                    complete: () => {
                        console.logD(`User event Loop Ending`);
                    }
                });

        } catch (ex: any) {
            console.logE(ex);
        }
    }

    private _playerEnter(connectionId: string, request: ISocketDocument) {
        try {
            this._container?.playerEnter.call(
                this._container,
                connectionId);
        } catch (ex: any) {
            console.logE(ex);
        }

    }

    private _playerExit(connectionId: string, request: ISocketDocument) {
        try {
            console.logI(`:UserExit called. connectionId:${connectionId}, gamePrimaryName:${request.gamePrimaryName}`);

            this._container?.playerExit.call(
                this._container,
                connectionId)
                .then(content => {

                })
                .catch(ex => {
                    console.logE(ex);
                });
        } catch (ex: any) {
            console.logE(ex);
        }

    }

    private _playerEventIn(connectionId: string, request: ISocketDocument) {
        try {

            console.logD("BackendSocket._playerEventIn called", connectionId, request);
            this._container?.playerEvent.call(this._container, connectionId, request.content);

        } catch (ex: any) {
            console.logE(ex);
        }
    }
}