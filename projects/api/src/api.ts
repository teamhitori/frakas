// theirs
import { Observable } from 'rxjs';

export interface PlayerEventContent<T> {
    playerPosition: number;
    playerState: T;
}

export interface IFrontendApi {
    sendToBackend(state: any): void;
    onPrivateEvent<T>(): Observable<T>;
    onPublicEvent<T>(): Observable<T>;
    onGameStop<T>(): Observable<T>;
}
export interface IBackendApi {
    sendToPlayer<T>(playerEventContent: PlayerEventContent<T>): void;
    sendToAll<T>(state: T): void;
    onPlayerEvent<T>(): Observable<PlayerEventContent<T>>;
    onPlayerEnter(): Observable<number>;
    onPlayerExit(): Observable<number>;
    onGameStop(): Observable<void>;
    onGameStart(): Observable<void>;
}


export function setFrontend(feCallback: (n: IFrontendApi) => any) {

    if (typeof window === 'undefined') return;

    console.log("setFrontend called");

    var el = document.getElementById('ws-url');
    var wsUrl = (<HTMLInputElement>el)?.value;

    console.log(`ws-url:${wsUrl}`);

    var { FeWebsocket } = require('./fe/feWebsocket');
    var { PlayerContainer } = require('./fe/playerContainer');

    var feWebsocket = new FeWebsocket(`${wsUrl}`);
    
    new PlayerContainer(feWebsocket, feCallback);
}

export function setBackend(beCallback: (n: IBackendApi) => any) {

    if (typeof process === 'object') {
        var runAsync = async () => {
            const yargs = require('yargs/yargs');
            const { hideBin } = require('yargs/helpers');
            const { BeWebsocket } = require('./be/beWebsocket');
            const argv = await yargs(hideBin(process.argv))
                .usage("Usage: --port")
                .option("port", { alias: "p", describe: "websocket port number to listen on", type: "number", demandOption: true })
                .argv

            console.log("beCallback called");
            console.log(`ws port:${argv.port}`);

            new BeWebsocket(argv.port, beCallback);
        }
        runAsync()
    }
}