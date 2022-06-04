import { Observable } from 'rxjs';
import { FrontendHttp } from './fe/FrontendHttp';
import { FrontendSocket } from './fe/FrontendSocket';
import * as commander from 'commander';
import { get } from './utils/http';
import { FrakasJson } from './documents/FrakasJson';

export interface PlayerEventContent<T> {
    playerPosition: number;
    playerState: T;
}

export interface IFrontendApi {
    playerEnter(): void;
    sendToBackend<T>(state: T): void;
    onPrivateEvent<T>(): Observable<T>;
    onPublicEvent<T>(): Observable<T>;
    onGameStop(): Promise<void>;
    assetsRoot: string;
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

export function createFrontend(feCallback: (n: IFrontendApi) => any) {

    try {
        if (typeof window === 'undefined') return;

        document.addEventListener("DOMContentLoaded", async (event) => {

            var { wsUrl, remoteHttpBase } = await _setupFrontend();

            new FrontendSocket(`${wsUrl}`, remoteHttpBase, "assets", feCallback);
        });
    } catch (error) {
        console.log(error)
        throw error;
    }
}

export function createFrontendHttp(feCallback: (n: IFrontendApi) => any) {

    try {

        if (typeof window === 'undefined') return;

        document.addEventListener("DOMContentLoaded", async (event) => {

            var { remoteHttpBase, gamePrimaryName } = await _setupFrontend();

            new FrontendHttp(gamePrimaryName, remoteHttpBase, "assets", feCallback);
        });

    } catch (error) {
        console.log(error)
        throw error;
    }
}

export function createBackend(beCallback: (n: IBackendApi) => any) {

    try {
        if (typeof process === 'object' && typeof window === 'undefined') {
            var runAsync = async () => {

                console.log("createBackend called");

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

                new BackendSocket(beCallback, options.noLocalhost, options.remoteHost);
            }
            runAsync()
        }

    } catch (error) {
        console.log(error)
        throw error;
    }
}

export function createBackendHttp(beCallback: (n: IBackendApi) => any, request: any | null = null, response: any | null = null) {

    try {
        if (typeof process === 'object' && typeof window === 'undefined') {
            console.log("I am Backend")
            var runAsync = async () => {

                console.log("createBackendHttp called");

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

                new BackendHttp(beCallback, options.noLocalHost, options.remoteHost, request, response);
            }
            runAsync()
        }
    } catch (error) {
        console.log(error)
        throw error;
    }
}

async function _setupFrontend(): Promise<{ wsUrl: string, remoteHttpBase: string, gamePrimaryName: string }> {

    console.log("setFrontend called");

    var config = await get("frakas.json") as FrakasJson;

    console.log("GET frakas.json", config);

    var isLocalHost = getParameterByName("remote-host") == "false";
    var gamePrimaryName = getParameterByName("game-primary-name") ?? ""

    var hostName = isLocalHost || !config.remoteHost ? "localhost" : config.remoteHost;

    var wsUrl =  location.protocol === 'https:' ? `wss://${hostName}/ws` : `ws://${hostName}:${config.webPort}/ws`

    var fill = config.fillScreen;
    var ratio = +config.screenRatio;

    var remoteHttpBase = location.protocol === 'https:' ? `https://${hostName}` : `http://${hostName}:${config.webPort}`;

    if (gamePrimaryName) {
        wsUrl = `${wsUrl}/${gamePrimaryName}`;
    }

    console.log(`ws-url:${wsUrl}`);
    console.log(`fill-screen:${fill}`);
    console.log(`screen-ratio:${ratio}`);

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