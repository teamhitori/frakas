import { FrontendTopic, IFrontendApi } from "../public";
import { Observable, Subject } from 'rxjs';
import { LogLevel } from "../utils/LogLevel";

export class FrontendContainer {

    public playerEntered = false;
    private _onPlayerEnterEvent: Promise<void>;
    private _onFrontendEvent: Subject<{topic: FrontendTopic, state: any | undefined}> = new Subject();
    private _notifyPlayerEvent: Subject<any> = new Subject<any>();
    private _frontendApi: IFrontendApi;

    constructor(assetsRoot: string) {

        console.logDebug(`create playerContainer`);

        var playerEnter: () => void;

        this._onPlayerEnterEvent = new Promise<void>((resolve) => {
            playerEnter = resolve;
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
            assetsRoot: assetsRoot,
            dispose: () => {
                console.logDebug(`dispose frontendApi`);

                this._onFrontendEvent.complete();
                this._notifyPlayerEvent.complete();
            }
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
        console.logDebug("***")
    }

    public playerEventObservable(): Observable<any> {
        return this._notifyPlayerEvent;
    }
}