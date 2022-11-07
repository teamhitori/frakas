import { Observable, Subject, tap } from 'rxjs';
import { FrontendHttp } from './fe/FrontendHttp';
import { FrontendSocket } from './fe/FrontendSocket';
import * as commander from 'commander';
import { get } from './utils/http';
import { FrakasJson } from './documents/FrakasJson';
import { LogLevel } from './utils/LogLevel';
import chalk from 'chalk';
import { BackendSocket } from './be/BackendSocket';
import { BackendHttp } from './be/BackendHttp';
import { Disposable } from 'rx';
import { v4 as uuid } from 'uuid'

console.logE = (...args) => { if (global.loglevel >= LogLevel.error) console.log(chalk.red(...args)); };
console.logW = (...args) => { if (global.loglevel >= LogLevel.warning) console.log(chalk.yellow(...args)); };
console.logI = (...args) => { if (global.loglevel >= LogLevel.info) console.log(chalk.gray(...args)); };
console.logDebug = (...args) => { if (global.loglevel >= LogLevel.debug) console.log(...args); };
console.logDiag = (...args) => { if (global.loglevel >= LogLevel.diagnosic) console.log(chalk.blue(...args)); };

export enum FrontendTopic {
    privateEvent = 0,
    publicEvent = 2,
}

export enum BackendTopic {
    playerEvent = 1,
    start = 3,
    playerEnter = 5,
    playerExit = 7,
}

/**
 *  Front End API
 *  Contains useful functions for passing data to the backend server and responding to server events
 */
export interface IFrontendApi {

    /**
     * Notify Server that Player has "Entered" game, this is the point as which the server will assign a "PlayerPosition" to the Client 
     */
    playerEnter(): void;

    /**
     * Sends data from the Client to the backend server in the context of a Player, when this event 
     * is received by the server it will be associated with a "PlayerPosition".
     * @param state data to send to the backend
     */
    sendEvent<T>(state: T): void;

    /**
     * Observable that allows client to respond to a private (player specific) event from the server
     */
    receiveEvent<T>(): Observable<{ topic: FrontendTopic, state: T | undefined }>;

    /**
     * The location of the static assets folder, since this value can change based on deployment configuration, this value will always represent the correct location 
     */
    assetsRoot: string;

    /*
    Dispose instance and complete observables
    */
    dispose(): void;
}

/**
 *  Back End API
 *  Contains useful functions for passing data to the client and responding to client events
 */
export interface IBackendApi {

    /**
     * Send event data so a specific connected player client
     * @param eventState Defines event data as well as player position of client that should receive data
     */
    sendToPlayer<T>(playerPosition: number, state: T): void;

    /**
     * Send event data so all connected player clients
     * @param state Defines event data
     */
    sendToAll<T>(state: T): void;

    /**
     * Observable that allows server to respond to a Player specific event from the client
     * The event is wrapped in playerEventContent<T> which defines event data as well as player position of client that sent the data
     */
    receiveEvent<T>(): Observable<{ playerPosition: number | undefined, topic: BackendTopic, state: T | undefined }>;

    /*
    Dispose instance and complete observables
    */
    dispose(): void;
}

export interface IOptions {
    loglevel: LogLevel
}


var frontendSocket: FrontendSocket | undefined;
/**
 * Create Frontend.
 * Establishes frontend runtine along with websocket connection to backend server
 *
 * ```ts
 * var api = createFrontend({ loglevel: LogLevel.info });
 * ```
 */
export function createFrontend(options: IOptions | undefined = undefined): Promise<IFrontendApi | undefined> {

    global.loglevel = options?.loglevel ?? LogLevel.error;

    return new Promise<IFrontendApi | undefined>(async resolve => {

        try {
            if (typeof window === 'undefined') {
                resolve(undefined);
            } else {
                console.logDebug("createFrontend window");

                if(frontendSocket == undefined) {
                    var { wsUrl, remoteHttpBase } = await _setupFrontend();
                    frontendSocket = new FrontendSocket(`${wsUrl}`, remoteHttpBase, "assets");
                }

                resolve(frontendSocket.getFrontendApi());
            }
        } catch (error) {
            console.logE(error);
            resolve(undefined);
        }
    });
}


const localPlayersEventSubject: {
    [playerPosition: number]: Subject<{
        topic: FrontendTopic;
        state: any | undefined;
    }>
} = {}

/**
 * Create Frontend.
 * Creates frontend runtine that can connect to a locally running backend runtime
 *
 * ```ts
 * var api = createFrontendLocal(0, LogLevel.info);
 * ```
 */
export async function createFrontendLocal(playerPosition: number, options: IOptions | undefined = undefined): Promise<IFrontendApi | undefined> {

    global.loglevel = options?.loglevel ?? LogLevel.error;

    return new Promise<IFrontendApi | undefined>(async resolve => {

        try {
            if (typeof window === 'undefined') {
                resolve(undefined);
            } else {
                console.logDebug("createFrontendLocal window");

                if (localPlayersEventSubject[playerPosition] == undefined) {

                    var playerEntered = false;

                    const playerEventSubject = new Subject<{
                        topic: FrontendTopic;
                        state: any | undefined;
                    }>();

                    localPlayersEventSubject[playerPosition] = playerEventSubject;                    
                }

                var frontendApi = <IFrontendApi>{
                    playerEnter: () => {

                        if (!playerEntered) {
                            playerEntered = true;

                            for (const instanceId in localBackendEventSubject) {
                                var instance = localBackendEventSubject[instanceId];

                                instance.next({ playerPosition: playerPosition, topic: BackendTopic.playerEnter, state: undefined });
                            }
                            
                            console.logDebug(`playerEnter [playerPosition: ${playerPosition}]`);
                        }
                    },
                    sendEvent: (state: any) => {

                        if (!playerEntered) {
                            console.logW("Event not sent, please call frontentApi.playerEnter() to init backend connection")
                            return;

                        }

                        if (global.loglevel >= LogLevel.diagnosic) {
                            console.logDiag(`sendToBackend [playerPosition: ${playerPosition}]`, JSON.stringify(state));
                        }

                        for (const instanceId in localBackendEventSubject) {
                            var instance = localBackendEventSubject[instanceId];
                            instance.next({ playerPosition: playerPosition, topic: BackendTopic.playerEvent, state: state });
                        }
                        
                    },

                    receiveEvent: () => {
                        return localPlayersEventSubject[playerPosition]
                            ?.asObservable()
                            .pipe(
                                tap(e => {
                                    console.logDiag("feApi receiveEvent", playerPosition, e)
                                })
                            );
                    },
                    assetsRoot: "assets",
                    dispose: () => {

                        console.logDebug(`dispose [playerPosition: ${playerPosition}]`)

                        localPlayersEventSubject[playerPosition]?.complete();
                        delete localPlayersEventSubject[playerPosition];
                    }
                }

                resolve(frontendApi);
            }
        } catch (error) {
            console.logE(error);
            resolve(undefined);
        }
    });

}


const localBackendEventSubject: {
    [instanceId: string]: Subject<{
        playerPosition: number | undefined,
        topic: BackendTopic,
        state: any | undefined
    }>
} = {}

/**
 * Create Local Backend.
 * Creates backend that runs in the browser alongside front end
 *
 * ```ts
 * var api = createBackendLocal({ loglevel: LogLevel.info });
 * ```
 */


export async function createBackendLocal(options: IOptions | undefined = undefined): Promise<IBackendApi | undefined> {

    global.loglevel = options?.loglevel ?? LogLevel.error;

    return new Promise<IBackendApi | undefined>(resolve => {

        try {
            if (typeof window === 'undefined') {
                console.logDebug("cannot ceate local IBackendApi in node process");
                resolve(undefined);
            } else {
                console.logDebug("createBackendLocal window");

                let instanceId = uuid();

                localBackendEventSubject[instanceId] = new Subject();

                var localBackend = <IBackendApi>{
                    sendToPlayer: (playerPosition: number, state: any) => {
                
                        if (global.loglevel >= LogLevel.diagnosic) {
                            console.logDiag(`sendToPlayer [playerPosition: ${playerPosition}]`, JSON.stringify(state));
                        }
                
                        localPlayersEventSubject[playerPosition]?.next({ topic: FrontendTopic.privateEvent, state: state });
                    },
                    sendToAll: (state: any) => {
                
                        if (global.loglevel >= LogLevel.diagnosic) {
                            console.logDiag("sendToAll", JSON.stringify(state));
                        }
                
                        for (const playerPosition in localPlayersEventSubject) {
                
                            localPlayersEventSubject[playerPosition]?.next({ topic: FrontendTopic.publicEvent, state: state });
                        }
                    },
                    receiveEvent: () => {
                        return localBackendEventSubject[instanceId]
                            .asObservable()
                            .pipe(
                                tap(e => {
                                    console.logDiag("beApi receiveEvent", e)
                                })
                            );
                    },
                    dispose: () => {
                        console.logDebug(`dispose [instanceId: ${instanceId}]`);
                        localBackendEventSubject[instanceId]?.complete();
                        delete localBackendEventSubject[instanceId];
                    }
                };

                resolve(localBackend);
            }

        } catch (error) {
            console.logE(error)
            resolve(undefined);
        }
    });
}

/**
 * Create Frontend.
 * Establishes frontend runtine along with a http connection to backend server
 *
 * ```ts
 * var api = createFrontendHttp({ loglevel: LogLevel.info });
 * ```
 */
var frontendHttp: FrontendHttp | undefined
export function createFrontendHttp(options: IOptions | undefined = undefined): Promise<IFrontendApi | undefined> {

    global.loglevel = options?.loglevel ?? LogLevel.error;

    return new Promise<IFrontendApi | undefined>(async resolve => {
        try {

            if (typeof window === 'undefined') {
                resolve(undefined);
            } else {

                if (frontendHttp == undefined) {
                    var { remoteHttpBase, gamePrimaryName } = await _setupFrontend();

                    frontendHttp = new FrontendHttp(gamePrimaryName, remoteHttpBase, "assets");
                }

                resolve(frontendHttp.getFrontendApi());
            }

        } catch (error) {
            console.logE(error)
            resolve(undefined)
        }

    });
}


var backendSocket: BackendSocket | undefined;
/**
 * Create Backend.
 * Establishes backend server runtine along with websocket connection to frontend clients
 *
 * ```ts
 * var api = createBackend({ loglevel: LogLevel.info });
 * ```
 */
export async function createBackend(options: IOptions | undefined = undefined): Promise<IBackendApi | undefined> {

    global.loglevel = options?.loglevel ?? LogLevel.error;

    return new Promise<IBackendApi | undefined>(resolve => {

        try {
            if (typeof process === 'object' && typeof window === 'undefined') {

                console.logDebug("createBackend called.");

                if (backendSocket == undefined) {
                    const { BackendSocket } = require('./be/BackendSocket');

                    const program = new commander.Command();

                    program
                        .name('frakas backend')
                        .description('backend server')
                        .version('0.0.0');

                    program
                        .option('-n, --no-localhost')
                        .option('-r, --remote-host');

                    program.parse(process.argv);

                    const options = program.opts();

                    backendSocket = new BackendSocket(options.noLocalhost, options.remoteHost);
                }

                resolve(backendSocket?.getBackendApi());
            } else {
                resolve(undefined);
            }

        } catch (error) {
            console.logE(error)
            resolve(undefined);
        }
    });
}



/**
 * Create Backend.
 * Establishes backend server runtine along with a http connection to frontend clients
 *
 * ```ts
 * var api = createBackendHttp({ loglevel: LogLevel.info });
 * ```
 */
var backendHttp: BackendHttp | undefined;
export function createBackendHttp(request: any | null = null, response: any | null = null, options: IOptions | undefined = undefined): Promise<IBackendApi | undefined> {

    global.loglevel = options?.loglevel ?? LogLevel.error;

    return new Promise<IBackendApi | undefined>(resolve => {

        try {
            if (typeof process === 'object' && typeof window === 'undefined') {

                console.logDebug("createBackendHttp called");

                if (backendHttp == undefined) {
                    const { BackendHttp } = require('./be/BackendHttp');

                    const program = new commander.Command();

                    program
                        .name('frakas backend')
                        .description('backend server')
                        .version('0.0.0');

                    program
                        .option('-n, --no-localhost')
                        .option('-r, --remote-host');

                    program.parse(process.argv);

                    const options = program.opts();

                    backendHttp = new BackendHttp(options.noLocalHost, options.remoteHost, request, response);
                }

                resolve(backendHttp?.getBackendApi());
            } else {
                resolve(undefined);
            }
        } catch (error) {
            console.logE(error)
            resolve(undefined);
        }
    });
}

async function _setupFrontend(): Promise<{ wsUrl: string, remoteHttpBase: string, gamePrimaryName: string }> {

    console.logDebug("setFrontend called");

    var config = await get("frakas.json") as FrakasJson;

    console.logDebug("GET frakas.json", config);

    var isLocalHost = getParameterByName("remote-host") == "false";
    var gamePrimaryName = getParameterByName("game-primary-name") ?? ""

    var hostName = isLocalHost || !config.remoteHost ? window.location.host : config.remoteHost;

    var wsUrl = location.protocol === 'https:' ? `wss://${hostName}/ws` : `ws://${hostName}/ws`

    var fill = config.fillScreen;
    var ratio = +config.screenRatio;

    var remoteHttpBase = location.protocol === 'https:' ? `https://${hostName}` : `http://${hostName}:${config.webPort}`;

    if (gamePrimaryName) {
        wsUrl = `${wsUrl}/${gamePrimaryName}`;
    }

    console.logDiag(`ws-url:${wsUrl}`);
    console.logDebug(`fill-screen:${fill}`);
    console.logDebug(`screen-ratio:${ratio}`);

    _setupGameWindow(fill, ratio);


    return { wsUrl, remoteHttpBase, gamePrimaryName }
}

function _setupGameWindow(fillScreen: boolean, screenRatio: number) {
    // window.addEventListener('resize', () => {
    //     _resizeCanvas(fillScreen, screenRatio);
    // });

    _resizeCanvas(fillScreen, screenRatio);
}

function _resizeCanvas(fillScreen: boolean, screenRatio: number) {

    var holder = document.querySelector('#renderCanvas-holder');

    // if(window.innerHeight > window.innerWidth){
    //     holder?.classList.add("rotate-window");
    // } else {
    //     holder?.classList.remove("rotate-window");
    // }

    if (fillScreen) {
        _resizeCanvasFillscreen();
    } else {
        _resizeCanvasRatio(screenRatio);
    }
}

function _resizeCanvasFillscreen() {
    var canvasEl = document.getElementById('renderCanvas');

    canvasEl?.setAttribute('style', `width: 100%; height: 100%;`);
}

function _resizeCanvasRatio(screenRatio: number) {

    var canvasHolderEl = document.getElementById('renderCanvas-holder') as any;
    var canvasEl = document.getElementById('renderCanvas');

    var offsetW = 15;
    var offsetH = 30;
    var canvasHolderH = canvasHolderEl?.offsetHeight;
    var canvasHolderW = canvasHolderEl?.offsetWidth;

    var maxHeight = canvasHolderW * (1 / screenRatio);
    var maxWidth = canvasHolderH * screenRatio;

    if (maxHeight > canvasHolderH - offsetH) {
        var width = (canvasHolderH - offsetH) * screenRatio;
        var height = canvasHolderH - offsetH;
        canvasEl?.setAttribute('style', `width: ${width}px; height: ${height}px;`);

    } else if (maxWidth > canvasHolderW - offsetW) {
        var width = (canvasHolderW - offsetW);
        var height = (canvasHolderW - offsetW) / screenRatio;
        canvasEl?.setAttribute('style', `width: ${width}px; height: ${height}px;`);
    }

}

function getParameterByName(name: string, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}


