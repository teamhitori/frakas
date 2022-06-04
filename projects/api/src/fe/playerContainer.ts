import { IFrontendApi } from "../public";
import { FrontendSocket as FrontendSocket } from "./FrontendSocket";
import { Observable, Subject } from 'rxjs';
import { bufferTime } from 'rxjs/operators';
import { IPlayerEventWrapper } from "../documents/IPlayerEventWrapper";

// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'frakas/main.css'

export class PlayerContainer {

    //private _isGameActive = false;
    public playerEntered = false;

    private _onPlayerEnterEvent: Promise<void>;

    private _onPrivateEvent: Subject<any> = new Subject();
    private _onPublicEvent: Subject<any> = new Subject();
    private _onGameStopEvent: Promise<void>;
    private _notifyPlayerEvent: Subject<any> = new Subject<any>();

    constructor(
        //private _websocketService: FrontendSocket,
        assetsRoot: string,
        private _feCallback: (n: IFrontendApi) => any
    ) {

        console.log(`create playerContainer`);

        var playerEnter: () => void;
        //var gameStop: () => void;

        this._onPlayerEnterEvent = new Promise<void>((resolve) => {
            playerEnter = resolve;
        });

        this._onGameStopEvent = new Promise<void>((resolve) => {

            this.onGameStop = resolve;

        });

        try {
            var frontendApi = <IFrontendApi>{
                playerEnter: () => {
                   
                    if (!this.playerEntered) {
                        this.playerEntered = true;
                        playerEnter();
                    }
                },
                sendToBackend: (state: any) => {

                    if (!this.playerEntered) {
                        console.log("Event not sent, please call frontentApi.playerEnter() to init backend connection")
                        return;
                
                    }
                    
                    this._notifyPlayerEvent.next(state);
                },

                onPrivateEvent: () => {
                    return this._onPrivateEvent;
                },
                onPublicEvent: () => {
                    return this._onPublicEvent;
                },
                onGameStop: () => {
                    return this._onGameStopEvent;
                },
                assetsRoot: assetsRoot
            };

            this._feCallback(frontendApi);
        } catch (error) {
            console.log(error);
        }

    }

    public publicEvent(message: any) {
        if (!this.playerEntered) return;
        var state = JSON.parse(message)
        this._onPublicEvent.next(state)
    }

    public privateEvent(message: any) {
        this._onPrivateEvent.next(JSON.parse(message));
    }

    public onPlayerEnter(): Promise<void> {
        return this._onPlayerEnterEvent;
    }


    public onGameStop() {

        console.log("***")
        
    }

    public playerEventObservable(): Observable<any> {
        return this._notifyPlayerEvent;
    }

}