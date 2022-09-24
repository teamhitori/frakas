import express, { Request, Response } from "express";
import { filter, Subscription } from "rxjs";
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

import { IBackendApi } from "../public";
import { IHttpDocument } from "../documents/IHttpDocument";
import { ISocketDocument } from "../documents/ISocketDocument";
import { Topic } from "../documents/Topic";
import { GameContainer } from "./GameContainer";
import { getFrakasJson } from "../documents/FrakasJson";
import { createLocalHost } from "./LocalHost";

export class BackendHttp {

    private _connections: {
        [name: string]: { docs: ISocketDocument[], idleCounter: number }
    } = {};
    private _container: GameContainer;

    /**
     * Create and instance of BackendHttp Server which  takes an optional Express Request object for scenarios
     * where the backend game container lives in an existing web server context. Alternatively, if Express Request
     * object is null, a new webserver instance will be created  
     */
    constructor(beCallback: (n: IBackendApi) => any, private _noHost: boolean, private _remoteHost: boolean, request: Request | null = null, response: Response | null = null) {

        this._container = new GameContainer(beCallback);
        this._init(request, response)

        this.startCheckIdle();
    }

    private startCheckIdle() {

        var checkIdle = () => {
            for (const connectionId in this._connections) {
                this._connections[connectionId].idleCounter--

                if (this._connections[connectionId].idleCounter <= 0) {
                    this._playerExit(connectionId);
                    delete this._connections[connectionId];
                }
            }

            setTimeout(checkIdle, 2000);
        }

        setTimeout(checkIdle, 2000);
    }

    private async _init(request: Request | null = null, response: Response | null = null) {

        var config = getFrakasJson();

        console.logD("frakas.config, contents: ", config);

        if (request && response) {

            this._createBackend(request, response);

        } else {

            var noHost = () => {
                var app = express();
                app.listen(config.webPort);

                console.logI(`Starting express server on port ${config.webPort}`);

                return app;
            }

            const app = this._noHost ?
                noHost() :
                await createLocalHost(this._remoteHost);

            // parse application/json
            app.use(express.json());

            app.use(cors({
                origin: '*'
            }));

            app.post("/frakas-connection/", async (req, res) => {
                try {
                    this._createBackend(req, res);


                } catch (error) {
                    console.logE(error);
                    res.sendStatus(500);
                }
            });
        }
    }

    private _createBackend(request: Request, response: Response) {

        var httpDoc = request.body as IHttpDocument

        if (!httpDoc) {
            console.logDiag(request.body);
            return;
        }

        for (const socDoc of httpDoc.socketDocuments) {
            switch (socDoc.topic) {
                case Topic.connect:
                    httpDoc.connectionId = uuidv4();
                    console.logD(`New Connection: ${httpDoc.connectionId}`)
                    this._connections[httpDoc.connectionId] = {
                        idleCounter: 2,
                        docs: []
                    };
                    this._connections[httpDoc.connectionId].docs.push(<ISocketDocument>{ topic: Topic.connect, content: httpDoc.connectionId });
                    this._startGame(httpDoc.connectionId, socDoc);
                    this._startPrivateEvent(httpDoc.connectionId, socDoc);
                    break;
                case Topic.ping:
                    console.logD(`Ping:[${httpDoc.connectionId}, ${socDoc.content}]`);
                    this._connections[httpDoc.connectionId].docs.push(<ISocketDocument>{ topic: Topic.ping, content: `Pong:[${socDoc.content}]` });
                    break;
                case Topic.playerEnter:
                     console.logD(`Topic.playerEnter: ${httpDoc.connectionId}`);
                    this._playerEnter(httpDoc.connectionId, socDoc);
                    break;
                case Topic.playerExit:
                    console.logD(`Topic.playerExit: ${httpDoc.connectionId}`);
                    this._playerExit(httpDoc.connectionId);
                    break;
                case Topic.playerEvent:
                    this._playerEventIn(httpDoc.connectionId, socDoc);
                    break;
                case Topic.metrics:
                    break;
            }

        }

        if (this._connections[httpDoc.connectionId]) {
            this._connections[httpDoc.connectionId].idleCounter = 2;
            console.logDiag(`Player[${httpDoc.connectionId}] is alive!`);
            this._sendResponse(httpDoc.connectionId, response);
        } else {
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({}));
        }
    }

    private _sendResponse(connectionId: string, response: express.Response<any, Record<string, any>>) {
        var docs = this._connections[connectionId].docs;

        // if(docs.length) {
        //     console.log(`Send Response: ${connectionId}`, docs)
        // }

        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify(docs));

        this._connections[connectionId].docs = [];
    }

    private _startGame(connectionId: string, request: ISocketDocument) {
        try {
            console.logD(`:StartGame called. gamePrimaryName:${request.gamePrimaryName}, connectionId: ${connectionId}`);

            this._container?.startGame.call(this._container);

            return this._container?.sendToAllObservable()
                .subscribe({
                    next: content => {
                        var contentStr = JSON.stringify(content);

                        this._connections[connectionId]?.docs.push(<ISocketDocument>{ topic: Topic.publicEvent, content: contentStr })

                    },
                    error: ex => {
                        console.logE(ex);
                        console.logD(`Error Loop Ending, gamePrimaryName:${request.gamePrimaryName}`);
                    },
                    complete: () => {
                        console.logD(`Loop Ending, gamePrimaryName:${request.gamePrimaryName}`);
                    }
                });

        } catch (ex: any) {
            console.logE(ex);
        }

        return undefined;
    }

    private _startPrivateEvent(connectionId: string, request: ISocketDocument) {
        try {

            console.logD(`:StartPlayerEvent called.  gamePrimaryName:${request.gamePrimaryName}, connectionId:${connectionId}`);

            return this._container?.sendToPlayerObservable.call(this._container)
                .pipe(filter(message => {
                    var res = message.connectionId == connectionId;
                    return res;
                }))
                .subscribe({
                    next: message => {
                        console.logD(`_privateEvent: ${connectionId}`, message.state, this._connections[connectionId]);
                        var contentStr = JSON.stringify(message.state);
                        this._connections[connectionId]?.docs.push(<ISocketDocument>{ topic: Topic.privateEvent, content: contentStr });
                    },
                    error: ex => {
                        console.logE(ex);
                        console.logD(`Error User event Loop Ending, gamePrimaryName:${request.gamePrimaryName}`);
                    },
                    complete: () => {
                        console.logD(`User event Loop Ending, gamePrimaryName:${request.gamePrimaryName}`);
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

    private _playerExit(connectionId: string) {
        try {
            console.logD(`:UserExit called. connectionId:${connectionId}`);

            this._container?.playerExit.call(
                this._container,
                connectionId);
        } catch (ex: any) {
            console.logE(ex);
        }

    }

    private _playerEventIn(connectionId: string, request: ISocketDocument) {
        try {
            this._container?.playerEvent.call(this._container, connectionId, request.content);
        } catch (ex: any) {
            console.logE(ex);
        }
    }
}