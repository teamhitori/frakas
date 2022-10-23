import { Observable } from 'rxjs';
import { FrontendHttp } from './fe/FrontendHttp';
import { FrontendSocket } from './fe/FrontendSocket';
import * as commander from 'commander';
import { get } from './utils/http';
import { FrakasJson } from './documents/FrakasJson';
import { LogLevel } from './utils/LogLevel';
import chalk from 'chalk';

console.logE = (...args) => { if (global.loglevel >= LogLevel.error) console.log(chalk.red(...args)); };
console.logW = (...args) => { if (global.loglevel >= LogLevel.warning) console.log(chalk.yellow(...args)); };
console.logI = (...args) => { if (global.loglevel >= LogLevel.info) console.log(chalk.gray(...args)); };
console.logD = (...args) => { if (global.loglevel >= LogLevel.debug) console.log(...args); };
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

// export interface EventState<T> {
//     topic: FrontendEvent | BackendEvent
//     eventState: T | undefined;
// }

// export interface FrontendEvent<T> {
//     topic: FrontendTopic, state: T | undefined
// }

// export interface BackendEvent<T> { 
//     topic: BackendTopic, 
//     state: T | undefined 
// }

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
    receiveEvent<T>(): Observable<{topic: FrontendTopic, state: T | undefined}>;

    /**
     * The location of the static assets folder, since this value can change based on deployment configuration, this value will always represent the correct location 
     */
    assetsRoot: string;
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

}

export interface IOptions {
    loglevel: LogLevel
}

/**
 * Create Frontend.
 * Establishes frontend runtine allong with websocket connection to backend server
 *
 * ```ts
 * createFrontend(async api => {
 *   -- api: IFrontendApi
 *
 * }, { loglevel: LogLevel.info });
 * ```
 */
export function createFrontend(options: IOptions | undefined = undefined): Promise<IFrontendApi | undefined> {

    global.loglevel = options?.loglevel ?? LogLevel.error;

    return new Promise<IFrontendApi | undefined>(resolve => {

        try {

            if (typeof window === 'undefined') {
                resolve(undefined);
            }

            console.log("createFrontend window");

            document.addEventListener("DOMContentLoaded", async (event) => {

                console.logD("DOMContentLoadedD");
                console.log("DOMContentLoaded");

                var { wsUrl, remoteHttpBase } = await _setupFrontend();

                var frontend = new FrontendSocket(`${wsUrl}`, remoteHttpBase, "assets");

                resolve(frontend.getFrontendApi());
            });
        } catch (error) {
            console.logE(error);
            resolve(undefined);
        }
    });


}

/**
 * Create Frontend.
 * Establishes frontend runtine allong with a http connection to backend server
 *
 * ```ts
 * createFrontendHttp(async api => {
 *   -- api: IFrontendApi
 *
 * }, { loglevel: LogLevel.info });
 * ```
 */
export function createFrontendHttp(options: IOptions | undefined = undefined): Promise<IFrontendApi | undefined> {

    global.loglevel = options?.loglevel ?? LogLevel.error;

    return new Promise<IFrontendApi | undefined>(resolve => {
        try {

            if (typeof window === 'undefined') resolve(undefined);

            document.addEventListener("DOMContentLoaded", async (event) => {

                var { remoteHttpBase, gamePrimaryName } = await _setupFrontend();

                var frontend = new FrontendHttp(gamePrimaryName, remoteHttpBase, "assets");

                resolve(frontend.getFrontendApi());
            });

        } catch (error) {
            console.logE(error)
            resolve(undefined)
        }

    });
}

/**
 * Create Backend.
 * Establishes backend server runtine allong with websocket connection to frontend clients
 *
 * ```ts
 * createBackend(async api => {
 *   -- api: IBackendApi
 *
 * }, { loglevel: LogLevel.info });
 * ```
 */
export async function createBackend(options: IOptions | undefined = undefined): Promise<IBackendApi | undefined> {

    global.loglevel = options?.loglevel ?? LogLevel.error;

    return new Promise<IBackendApi | undefined>(resolve => {

        try {
            if (typeof process === 'object' && typeof window === 'undefined') {

                console.logI("createBackend called.");

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

                var backendSocket = new BackendSocket(options.noLocalhost, options.remoteHost);

                var api = backendSocket.getBackendApi();

                resolve(api);
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
 * Establishes backend server runtine allong with a http connection to frontend clients
 *
 * ```ts
 * createBackendHttp(async api => {
 *   -- api: IBackendApi
 *
 * }, { loglevel: LogLevel.info });
 * ```
 */
export function createBackendHttp(request: any | null = null, response: any | null = null, options: IOptions | undefined = undefined): Promise<IBackendApi | undefined> {

    global.loglevel = options?.loglevel ?? LogLevel.error;

    return new Promise<IBackendApi | undefined>(resolve => {

        try {
            if (typeof process === 'object' && typeof window === 'undefined') {

                console.logI("createBackendHttp called");

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

                var backendHttp = new BackendHttp(options.noLocalHost, options.remoteHost, request, response);

                var api = backendHttp.getBackendApi();

                resolve(api);
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

    console.logI("setFrontend called");

    var config = await get("frakas.json") as FrakasJson;

    console.logD("GET frakas.json", config);

    var isLocalHost = getParameterByName("remote-host") == "false";
    var gamePrimaryName = getParameterByName("game-primary-name") ?? ""

    var hostName = isLocalHost || !config.remoteHost ? "localhost" : config.remoteHost;

    var wsUrl = location.protocol === 'https:' ? `wss://${hostName}/ws` : `ws://${hostName}:${config.webPort}/ws`

    var fill = config.fillScreen;
    var ratio = +config.screenRatio;

    var remoteHttpBase = location.protocol === 'https:' ? `https://${hostName}` : `http://${hostName}:${config.webPort}`;

    if (gamePrimaryName) {
        wsUrl = `${wsUrl}/${gamePrimaryName}`;
    }

    console.logDiag(`ws-url:${wsUrl}`);
    console.logD(`fill-screen:${fill}`);
    console.logD(`screen-ratio:${ratio}`);

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