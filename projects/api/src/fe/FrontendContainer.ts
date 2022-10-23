import { FrontendTopic, IFrontendApi } from "../public";
import { FrontendSocket as FrontendSocket } from "./FrontendSocket";
import { Observable, Subject } from 'rxjs';
import { bufferTime } from 'rxjs/operators';
import { IPlayerEventWrapper } from "../documents/IPlayerEventWrapper";
import { LogLevel } from "../utils/LogLevel";
import { Topic } from "../documents/Topic";

// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'frakas/main.css'

export class FrontendContainer {

    public playerEntered = false;
    private _onPlayerEnterEvent: Promise<void>;
    private _onGameStopEvent: Promise<void>;
    private _onFrontendEvent: Subject<{topic: FrontendTopic, state: any | undefined}> = new Subject();
    private _notifyPlayerEvent: Subject<any> = new Subject<any>();
    private _frontendApi: IFrontendApi;

    constructor(assetsRoot: string) {

        console.logD(`create playerContainer`);

        var playerEnter: () => void;

        this._onPlayerEnterEvent = new Promise<void>((resolve) => {
            playerEnter = resolve;
        });

        this._onGameStopEvent = new Promise<void>((resolve) => {
            this.onGameStop = resolve;
        });

        this._frontendApi = <IFrontendApi>{
            playerEnter: () => {
               
                if (!this.playerEntered) {
                    this.playerEntered = true;
                    playerEnter();
                }
            },
            sendEvent: (state: any) => {

                if (!this.playerEntered) {
                    console.logW("Event not sent, please call frontentApi.playerEnter() to init backend connection")
                    return;
            
                }

                if(global.loglevel >= LogLevel.diagnosic){
                    console.logDiag("sendToBackend", JSON.stringify(state));
                }
                
                this._notifyPlayerEvent.next(state);
            },

            receiveEvent: () => {
                return this._onFrontendEvent;
            },
            assetsRoot: assetsRoot
        };

    }

    public getFrontendApi(): IFrontendApi {
        return this._frontendApi;
    }

    public publicEvent(message: any) {

        if (!this.playerEntered) return;
        var state = JSON.parse(message);

        console.logDiag("publicEvent", message);

        this._onFrontendEvent.next({topic: FrontendTopic.publicEvent, state: state});
    }

    public privateEvent(message: any) {

        if (!this.playerEntered) return;

        var state = JSON.parse(message);

        console.logDiag("privateEvent", message);

        this._onFrontendEvent.next({topic: FrontendTopic.privateEvent, state: state});
    }

    public onPlayerEnter(): Promise<void> {
        return this._onPlayerEnterEvent;
    }


    public onGameStop() {
        console.logD("***")
    }

    public playerEventObservable(): Observable<any> {
        return this._notifyPlayerEvent;
    }
}