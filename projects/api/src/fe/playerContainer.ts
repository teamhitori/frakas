import { IFrontendApi } from "../api";
import { FeWebsocket as FeWebsocket } from "./feWebsocket";
import { Subject } from 'rxjs';
import { bufferTime } from 'rxjs/operators';
import { IPlayerEventWrapper } from "../documents/IPlayerEventWrapper";

import 'bootstrap/dist/css/bootstrap.min.css';
import 'frakas/main.css'

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

        this._isGameActive = true;
        this._notifyPlayerEvent
            .pipe(bufferTime(100))
            .subscribe(playerEvent => {
                if (this._isGameActive && playerEvent?.length) {
                    this._websocketService?.playerEventIn(playerEvent);
                }
            });

        this._websocketService?.startGame()
            .subscribe(
                data => {
                    if (!this._playerEntered) return;
                    var state = JSON.parse(data)
                    //console.log("onPublicEvent", state);
                    this._onPublicEvent.next(state)
                },
                err => {

                },
                () => {
                    this._onGameStopEvent.next({});
                    this._isGameActive = false;
                    this._playerEntered = false;
                }
            );

        this._feCallback({
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
                } else {
                    console.log("sendToBackend called but game not active")
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

        
    }

}