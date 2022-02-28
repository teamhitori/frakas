import { IFrontendApi } from "../api";
import { FeWebsocket as FeWebsocket } from "./feWebsocket";
import { Subject } from 'rxjs';
import { bufferTime } from 'rxjs/operators';
import { IPlayerEventWrapper } from "../documents/IPlayerEventWrapper";


export class PlayerContainer {

    private _isGameActive = false;
    private _playerEntered = false;
  
    private _onPrivateEvent: Subject<any> = new Subject();
    private _onPublicEvent: Subject<any> = new Subject();
    private _onGameStopEvent: Subject<any> = new Subject();

    private _notifyPlayerEvent: Subject<IPlayerEventWrapper> = new Subject<IPlayerEventWrapper>();


    constructor(
        private _websocketService: FeWebsocket,
        private _feCallback: (n: IFrontendApi) => any
    ) { 

        this.init();
    }

    init() {

        this._notifyPlayerEvent
            .pipe(bufferTime(100))
            .subscribe(playerEvent => {
                if (this._isGameActive) {
                    this._websocketService?.playerEventIn(playerEvent);
                }
            });

        this._websocketService?.startGame()
            .subscribe(
                data => {
                    if (!this._playerEntered) return;
                    var stateItems = JSON.parse(data)
                    for (const state of stateItems) {
                        this._onPublicEvent.next(state)
                    }
                },
                err => {

                },
                () => {
                    this._onGameStopEvent.next({});
                    this._isGameActive = false;
                    this._playerEntered = false;
                }
            );

        this._feCallback(<IFrontendApi>{
            sendToBackend: (state: any) => {
                if (!this._playerEntered) {
                    this._playerEntered = true;
                    this._websocketService.enterGame().subscribe(message => {
                        this._onPrivateEvent.next(JSON.parse(message));
                    });
                }

                if (this._isGameActive) {
                    var playerEvent = <IPlayerEventWrapper>{
                        data: state
                    }
                    this._notifyPlayerEvent.next(playerEvent);
                }
            },

            onPrivateEvent: () => {
                return this._onPrivateEvent;
            },
            onPublicEvent: () => {
                return this._onPublicEvent;
            },
            onGameStop: () => {
                return this._onGameStopEvent;
            }
        });

        this._isGameActive = true;
    }

}