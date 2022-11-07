
import { Observable, Subject } from 'rxjs';
import { BackendTopic, IBackendApi } from '../public';
import { LogLevel } from '../utils/LogLevel';

export class BackendContainer {

    private _sendToPlayerObservable: Subject<{ connectionId: string, state: any }> | null = null;
    private _sendToAllObservable: Subject<any> | null = null;
    private _loopActive = false;
    private _playerList: { [id: string]: any; } = {};
    private _nextPos = 0;
    private _onEvent: Subject<{ playerPosition: number | undefined, topic: BackendTopic, state: any | undefined }> = new Subject();
    private _backendApi: IBackendApi;

    public constructor() {
        this._backendApi = <IBackendApi>{
            sendToPlayer: (playerPosition: number, event: any) => {

                for (let connectionId in this._playerList) {
                    if (this._playerList[connectionId] == playerPosition) {

                        if (global.loglevel >= LogLevel.diagnosic) {
                            console.logDiag("sendToPlayer", JSON.stringify(event));
                        }

                        this._sendToPlayerObservable?.next({ "connectionId": connectionId, "state": event });
                    }
                }
            },
            sendToAll: (state: any) => {

                if (global.loglevel >= LogLevel.diagnosic) {
                    console.logDiag("sendToAll", JSON.stringify(state));
                }

                this._sendToAllObservable?.next(state);
            },
            receiveEvent: () => {
                return this._onEvent;
            },
            dispose: () => {

                console.logDebug(`dispose backendApi`);

                this._sendToPlayerObservable?.complete();
                this._sendToAllObservable?.complete();
                this._onEvent.complete();
            }
        };
    }

    public getBackendApi(): IBackendApi {
        return this._backendApi;
    }

    public startGame() {
        if (!this._loopActive) {
            console.logI(`startGame called`);

            this._loopActive = true;

            if (!this._sendToAllObservable) {
                this._sendToAllObservable = new Subject<any>();
            }

            if (!this._sendToPlayerObservable) {
                this._sendToPlayerObservable = new Subject<any>();
            }

            try {
                this._onEvent.next({ topic: BackendTopic.start, state: undefined, playerPosition: undefined });
            } catch (ex: any) {
                this._loopActive = false;
            }

        } else {
            console.logW(`startGame called, however game already started, ignoring..`);
        }
    }

    public sendToPlayerObservable(): Observable<{ connectionId: string, state: any }> {
        return this._sendToPlayerObservable!!;
    }

    public sendToAllObservable(): Observable<any> {
        return this._sendToAllObservable!!;
    }

    public destroyGame(): Promise<boolean> {
        return new Promise((resolve) => {
            if (this._loopActive) {
                this._playerList = {};
                this._nextPos = 0;
                this._loopActive = false;

                resolve(true);
            } else {
                resolve(false);
            }

        });
    }

    public playerEnter(connectionIdIn: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {

                var existingUser = false;
                var nextPos = this._nextPos;

                for (const connectionId in this._playerList) {
                    if (connectionId == connectionIdIn) {
                        existingUser = true;
                        nextPos = this._playerList[connectionIdIn];
                        console.logDebug(`## Existing USER ${connectionIdIn}, pos: ${this._playerList[connectionIdIn]}`);

                    }
                }

                if (!existingUser) {
                    console.logDebug(`### NEW USER [${connectionIdIn}]: pos: ${nextPos}`);
                    this._nextPos++;
                }

                this._playerList[connectionIdIn] = nextPos;
                this._onEvent.next({ topic: BackendTopic.playerEnter, state: undefined, playerPosition: nextPos });

                resolve(JSON.stringify({ position: this._playerList[connectionIdIn] }));

            } catch (ex) {
                console.logE(ex);
                reject(ex);
            }
        });
    }

    public playerExit(connectionIdIn: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {

                console.logI(`### USER EXITED [${connectionIdIn}] ###`);

                for (const connectionId in this._playerList) {
                    if (connectionId == connectionIdIn) {

                        this._onEvent.next({ topic: BackendTopic.playerExit, state: undefined, playerPosition: this._playerList[connectionIdIn] });

                        delete this._playerList[connectionIdIn];

                        var playerCount = 0;
                        for (const pos in this._playerList) {
                            playerCount++;
                        }

                        console.logDebug(`Removing existing connection ${connectionIdIn}, new user count: ${playerCount}`);
                    }
                }

                resolve("");
            } catch (ex) {
                console.logE(ex);
                reject(ex);
            }
        });
    }

    public playerEvent(connectionId: string, content: string) {
        try {
            var events = JSON.parse(content);

            var playerPosition = +this._playerList[connectionId]

            if (isNaN(playerPosition)) return;

            if (events.length) {
                console.logDiag(`playerEvent connectionId: ${connectionId}, playerPosition: ${playerPosition} content: ${content}, playerList: `, this._playerList);
            }

            for (const event of events) {

                this._onEvent.next({
                    topic: BackendTopic.playerEvent,
                    state: event,
                    playerPosition: playerPosition
                })
            }
        } catch (ex) {
            console.logE(ex);
        }
    }
}