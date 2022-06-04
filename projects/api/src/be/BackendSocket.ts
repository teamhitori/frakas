import WebSocket, { WebSocketServer } from 'ws';
import * as http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { filter, Subscription } from "rxjs";
import chalk from 'chalk';


// mine
import { ISocketDocument } from "../documents/ISocketDocument"
import { Topic } from '../documents/Topic';
import { IBackendApi } from '../public';
import { GameContainer } from './GameContainer';
import express from 'express';
import { getFrakasJson } from '../documents/FrakasJson';
import { createLocalHost } from './LocalHost';

export class BackendSocket {

    private _connections: { [name: string]: WebSocket } = {};
    private _container: GameContainer;

    constructor(beCallback: (n: IBackendApi) => any, private _noHost: boolean, private _remoteHost: boolean) {

        this._container = new GameContainer(beCallback);
        this._initWebsocket();
    }

    private async _initWebsocket() {
        try {
            var config = getFrakasJson();

            console.log("frakas.config, contents: ", config);

            if(isNaN(+config.webPort)){
                console.log(chalk.red("webPort not set to valid number in frakas.json, exiting"));
                return;
            }

            const server = http.createServer();

            const wss = new WebSocketServer({
                server: server
            });

            if(!this._noHost) {
                var app = await createLocalHost(this._remoteHost);
                server.on('request', app)
            }

            server.on('connect', (req, clientSocket, head) => {
                // Connect to an origin server
                console.log(`Connect event http://${req.url}`);
            });

            server.on('stream', (stream, headers) => {
                //console.log("stream called");
            });

            server.on('error', (err) => console.error(err));

            server.listen(config.webPort, function () {

                console.log(`http/ws server listening on ${config.webPort}`);
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
                            console.log(ex);
                        }
                    });

                    ws.on('close', (event) => {

                        console.log(`Close Event connectionId:${connectionId}`, event);

                        this._playerExit(connectionId, <ISocketDocument>{})

                        delete this._connections[connectionId];

                    });

                } catch (ex: any) {
                    console.log(ex);
                }
            });

            console.log(chalk.blue(`:Starting ws server on port ${config.webPort}`));

        } catch (ex: any) {
            console.log(ex);
            throw ex;
        }
    }



    private _startGame(connectionId: string, ws: WebSocket) {
        try {
            console.log(`:StartGame called connectionId: ${connectionId}`);

            this._container?.startGame.call(this._container);

            return this._container?.sendToAllObservable()
                .subscribe({
                    next: content => {
                        var contentStr = JSON.stringify(content);
                        ws.send(JSON.stringify(<ISocketDocument>{ topic: Topic.publicEvent, content: contentStr }));

                    },
                    error: ex => {
                        console.log(ex);
                        console.log(`Error Loop Ending`);
                    },
                    complete: () => {
                        console.log(`Loop Ending`);
                    }
                });

        } catch (ex: any) {
            console.log(ex);
        }

        return undefined;
    }

    private _startPlayerEvent(connectionId: string, ws: WebSocket) {
        try {

            console.log(`:StartPlayerEvent called. connectionId:${connectionId}`);

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
                        console.log(ex);
                        console.log(`Error User event Loop Ending`);
                    },
                    complete: () => {
                        console.log(`User event Loop Ending`);
                    }
                });

        } catch (ex: any) {
            console.log(ex);
        }
    }

    private _playerEnter(connectionId: string, request: ISocketDocument) {
        try {
            this._container?.playerEnter.call(
                this._container,
                connectionId);
        } catch (ex: any) {
            console.log(ex);
        }

    }

    private _playerExit(connectionId: string, request: ISocketDocument) {
        try {
            console.log(`:UserExit called. connectionId:${connectionId}, gamePrimaryName:${request.gamePrimaryName}`);

            this._container?.playerExit.call(
                this._container,
                connectionId)
                .then(content => {

                })
                .catch(ex => {
                    console.log(ex);
                });
        } catch (ex: any) {
            console.log(ex);
        }

    }

    private _playerEventIn(connectionId: string, request: ISocketDocument) {
        try {

            //console.log("BackendSocket._playerEventIn called", connectionId, request);
            this._container?.playerEvent.call(this._container, connectionId, request.content);

        } catch (ex: any) {
            console.log(ex);
        }
    }
}