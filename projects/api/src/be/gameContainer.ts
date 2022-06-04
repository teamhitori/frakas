
import { Observable, Subject } from 'rxjs';
import { IBackendApi, PlayerEventContent } from '../public';

export class GameContainer {

    private _sendToPlayerObservable: Subject<{ [id: string]: any; }> | null = null;
    private _sendToAllObservable: Subject<any> | null = null;

    private _loopActive = false;

    private _playerList: { [id: string]: any; } = {};
    private _nextPos = 0;

    private _onPlayerEvent: Subject<PlayerEventContent<any>> = new Subject();
    private _onGameLoop: Subject<any> = new Subject();
    private _onPlayerEnter: Subject<number> = new Subject();
    private _onPlayerExit: Subject<number> = new Subject();
    private _onGameStop: Subject<any> = new Subject()
    private _onGameStart: Subject<any> = new Subject()

    public constructor(beCallback: (n: IBackendApi) => any) {

        try {

            var backendApi = <IBackendApi>{
                sendToPlayer: (content: PlayerEventContent<any>) => {
                    
                    for (let connectionId in this._playerList) {
                        if (this._playerList[connectionId] == content.playerPosition) {
                            // console.log("sendToPlayer", content, this._playerList, this._sendToPlayerObservable);

                            this._sendToPlayerObservable?.next({ "connectionId": connectionId, "state": content.playerState });
                        }
                    }
                },
                sendToAll: (state: any) => {
                    this._sendToAllObservable?.next(state);
                },
                onPlayerEvent: () => {
                    return this._onPlayerEvent;
                },
                onGameLoop: () => {
                    return this._onGameLoop;
                },
                onPlayerEnter: () => {
                    return this._onPlayerEnter;
                },
                onPlayerExit: () => {
                    return this._onPlayerExit;
                },
                onGameStop: () => {
                    return this._onGameStop;
                },
                onGameStart: () => {
                    return this._onGameStart;
                }
            };

            beCallback(backendApi);

        } catch (error) {
            console.log(error);
        }
    }

    public startGame() {
        if (!this._loopActive) {
            console.log(`startGame called`);

            this._loopActive = true;

            if (!this._sendToAllObservable) {
                this._sendToAllObservable = new Subject<any>();
            }

            if (!this._sendToPlayerObservable) {
                this._sendToPlayerObservable = new Subject<any>();
            }

            try {
                this._onGameStart.next({});
            } catch (ex: any) {
                this._loopActive = false;
            }

        } else {
            console.log(`startGame called, however game already started, ignoring..`);
        }
    }

    public sendToPlayerObservable(): Observable<any> {
        return this._sendToPlayerObservable!!;
    }

    public sendToAllObservable(): Observable<any> {
        return this._sendToAllObservable!!;
    }

    public destroyGame(): Promise<boolean> {
        return new Promise((resolve, reject) => {
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
                        console.log(`## Existing USER ${connectionIdIn}, pos: ${this._playerList[connectionIdIn]}`);

                    }
                }

                if (!existingUser) {
                    console.log(`### NEW USER [${connectionIdIn}]: pos: ${nextPos}`);
                    this._nextPos++;
                }

                this._playerList[connectionIdIn] = nextPos;
                this._onPlayerEnter.next(nextPos);

                resolve(JSON.stringify({ position: this._playerList[connectionIdIn] }));

            } catch (ex) {
                console.log(ex);
                reject(ex);
            }
        });
    }

    public playerExit(connectionIdIn: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {

                console.log(`### USER EXITED [${connectionIdIn}] ###`);

                for (const connectionId in this._playerList) {
                    if (connectionId == connectionIdIn) {

                        this._onPlayerExit.next(this._playerList[connectionIdIn]);

                        delete this._playerList[connectionIdIn];

                        var playerCount = 0;
                        for (const pos in this._playerList) {
                            playerCount++;
                        }

                        console.log(`Removing existing connection ${connectionIdIn}, new user count: ${playerCount}`);
                    }
                }

                resolve("");
            } catch (ex) {
                console.log(ex);
                reject(ex);
            }
        });
    }

    public playerEvent(connectionId: string, content: string) {
        try {
            var events = JSON.parse(content);

            var playerPosition =  +this._playerList[connectionId]

            if(isNaN(playerPosition)) return;

            // if(events.length) {
            //     console.log(`GameContainer.playerEvent connectionId: ${connectionId}, content: ${content}, playerList: `, this._playerList);         
            // }

            for (const event of events) {

                // console.log(`GameContainer.playerEvent calling this._onPlayerEvent.next`, {
                //     playerPosition: playerPosition,
                //     playerState: event
                // });

                this._onPlayerEvent.next(<PlayerEventContent<any>>{
                    playerPosition: playerPosition,
                    playerState: event
                })
            }
        } catch (ex) {
            console.log(ex);
        }
    }
}