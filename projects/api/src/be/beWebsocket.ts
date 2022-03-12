import WebSocket, { WebSocketServer } from 'ws';
import * as http2 from 'http2';
import { v4 as uuidv4 } from 'uuid';
import { filter, Subscription } from "rxjs";
import chalk from 'chalk';

// mine
import { ISocketConnectedDocument } from "../documents/ISocketConnectedDocument"
import { Topic } from '../documents/Topic';
import { IBackendApi, IFrontendApi } from '../api';
import { GameContainer } from './gameContainer';

export class BeWebsocket {

    private _connections: { [name: string]: WebSocket } = {};
    private _container: GameContainer;
    private _port: number;

    /**
     *
     */
    constructor(private _args: any, beCallback: (n: IBackendApi) => any) {

        this._port = _args.port;
        this._container = new GameContainer(_args, beCallback);
        this._initWebsocket();
    }

    private _initWebsocket() {
        try {

            const server = http2.createServer(() => { });
            const wss = new WebSocketServer({ port: this._port });

            console.log(chalk.blue(`Starting ws server on port ${this._port}`));

            server.on('connect', (req, clientSocket, head) => {
                // Connect to an origin server
                if(this._args.verbose) console.log(`Connect event http://${req.url}`);
            });

            server.on('stream', (stream, headers) => {
                if(this._args.verbose) console.log("stream called");
            });

            server.on('error', (err) => console.error(err));

            server.on('upgrade', (request, socket, head) => {

                if(this._args.verbose) console.log(`upgrade event`, request);

                wss.handleUpgrade(request, socket, head, (ws) => {

                    if(this._args.verbose) console.log(`handleUpgrade event`, request);

                    wss.emit('connection', ws, request);
                });
            });

            wss.on('connection', (ws) => {
                try {
                    var connectionId = uuidv4();

                    this._connections[connectionId] = ws;

                    var gameLoopSub: Subscription | undefined = undefined;
                    var playerEventOutSub: Subscription | undefined = undefined;

                    if(this._args.verbose) console.log(`new connectionId: ${connectionId}`);

                    ws.on('message', async (event) => {
                        try {

                            var doc = JSON.parse(event.toString()) as ISocketConnectedDocument
                            //console.log(`message topic: ${Topic[doc.topic]}, connectionId: ${connectionId}`);

                            switch (doc.topic) {
                                case Topic.ping:
                                    ws.send(JSON.stringify(<ISocketConnectedDocument>{ topic: Topic.ping, content: `Pong ${doc.content}` }));
                                    break;
                                // case Topic.createGame:
                                //   await this._createGame(connectionId, doc);
                                //   break;
                                case Topic.startGame:
                                    gameLoopSub?.unsubscribe();
                                    playerEventOutSub?.unsubscribe();
                                    gameLoopSub = this._startGame(connectionId, doc, ws);

                                    playerEventOutSub = this._startPlayerEvent(connectionId, doc, ws);
                                    break;
                                // case Topic.destroyGame:
                                //   this._destroyGame(connectionId, doc, ws);
                                //   break;
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

                        this._playerExit(connectionId, <ISocketConnectedDocument>{})

                        delete this._connections[connectionId];

                    });

                } catch (ex: any) {
                    console.log(ex);
                }
            });
        } catch (ex: any) {
            console.log(ex);
        }


        // for (const connectionId in _this._connectionGame) {
        //     if (Object.prototype.hasOwnProperty.call(_this._connectionGame, connectionId)) {
        //         const gamePrimaryName = _this._connectionGame[connectionId];

        //         if (gamePrimaryName == gamePrimaryName) {
        //             var socket = _this._connections[connectionId];

        //             console.log(`Sending GameExit to connectionId:${connectionId}`)

        //             socket?.send(JSON.stringify(<ISocketConnectedDocument>{ topic: Topic.gameEnd }));
        //         }
        //     }
        // }
    }

    private _startGame(connectionId: string, request: ISocketConnectedDocument, ws: WebSocket): Subscription | undefined {
        try {
            if(this._args.verbose) console.log(`startGame called. gamePrimaryName:${request.gamePrimaryName}, connectionId: ${connectionId}`);

            this._container?.startGame.call(this._container, request);

            return this._container?.sendToAllObservable()
                .subscribe({
                    next: content => {
                        var contentStr = JSON.stringify(content);
                        ws.send(JSON.stringify(<ISocketConnectedDocument>{ topic: Topic.publicEvent, content: contentStr }));

                    },
                    error: ex => {
                        console.log(ex);
                        console.log(`Error Loop Ending, gamePrimaryName:${request.gamePrimaryName}`);
                    },
                    complete: () => {
                        if(this._args.verbose) console.log(`Loop Ending, gamePrimaryName:${request.gamePrimaryName}`);
                    }
                });

        } catch (ex: any) {
            console.log(ex);
        }

        return undefined;
    }

    private _startPlayerEvent(connectionId: string, request: ISocketConnectedDocument, ws: WebSocket): Subscription | undefined {
        try {

            if(this._args.verbose) console.log(`startPlayerEvent called.  gamePrimaryName:${request.gamePrimaryName}, connectionId:${connectionId}`);

            return this._container?.sendToPlayerObservable.call(this._container)
                .pipe(filter(message => {
                    var res = message.connectionId == connectionId;
                    return res;
                }))
                .subscribe({
                    next: message => {
                        var contentStr = JSON.stringify(message.state);
                        ws.send(JSON.stringify(<ISocketConnectedDocument>{ topic: Topic.privateEvent, content: contentStr }));
                    },
                    error: ex => {
                        console.log(ex);
                        console.log(`Error User event Loop Ending, gamePrimaryName:${request.gamePrimaryName}`);
                    },
                    complete: () => {
                        console.log(`User event Loop Ending, gamePrimaryName:${request.gamePrimaryName}`);
                    }
                });

        } catch (ex: any) {
            console.log(ex);
        }
    }

    private _destroyGame(callback: (material: boolean) => any) {
        try {

            if(this._args.verbose) console.log(`destroyGame called`);

            this._container?.destroyGame.call(this._container)
                .then(isMaterialDestroy => {
                    callback(isMaterialDestroy)
                    
                })
                .catch(ex => {
                    console.log(ex);
                })
                .finally(() => {
                });
        } catch (ex: any) {
            console.log(ex);
        }

    }

    private _playerEnter(connectionId: string, request: ISocketConnectedDocument) {
        try {
            this._container?.playerEnter.call(
                this._container,
                connectionId,
                request.content)
                .then(_ => {

                })
                .catch(ex => {
                    console.log(ex);
                });
        } catch (ex: any) {
            console.log(ex);
        }

    }

    private _playerExit(connectionId: string, request: ISocketConnectedDocument) {
        try {
            if(this._args.verbose) console.log(`userExit called. connectionId:${request?.connectionId}, gamePrimaryName:${request.gamePrimaryName}`);

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

    private _playerEventIn(connectionId: string, request: ISocketConnectedDocument) {
        try {

            if(this._args.verbose) console.log("_playerEventIn called", connectionId, request);
            this._container?.playerEventIn.call(this._container, connectionId, request.content);

        } catch (ex: any) {
            console.log(ex);
        }

    }
}