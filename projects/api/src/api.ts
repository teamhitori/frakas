import { Observable } from 'rxjs';
import { GameConfig } from './documents/__gameConfig';

export interface PlayerEventContent<T> {
    playerPosition: number;
    playerState: T;
}

export interface IFrontendApi {
    sendToBackend<T>(state: T): void;
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

    document.addEventListener("DOMContentLoaded", function (event) {

        console.log("setFrontend called");

        var elUrl = document.getElementById('ws-url');
        var wsUrl = (<HTMLInputElement>elUrl)?.value;

        var elFill = document.getElementById('fill-screen');
        var fill = (<HTMLInputElement>elFill)?.value == 'true';

        var elRatio = document.getElementById('screen-ratio');
        var ratio = +(<HTMLInputElement>elRatio)?.value;

        console.log(`ws-url:${wsUrl}`);
        console.log(`fill-screen:${fill}`);
        console.log(`screen-ratio:${ratio}`);

        _setupGameWindow(<GameConfig>{fillScreen: fill, screenRatio: ratio});

        var { FeWebsocket } = require('./fe/feWebsocket');
        var { PlayerContainer } = require('./fe/playerContainer');

        var feWebsocket = new FeWebsocket(`${wsUrl}`);

        console.log(`Create EventSource`);

        var evtSource = new EventSource("/subscribe");

        evtSource.onmessage = function () {
            window.location.reload();
        };

        new PlayerContainer(feWebsocket, feCallback);
    })
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
                .option("verbose", { alias: "v", describe: "verbose logging", type: 'boolean' })
                .argv

            console.log("beCallback called");
            console.log(`args`, argv);

            new BeWebsocket(argv, beCallback);
        }
        runAsync()
    }
}

function _setupGameWindow(gameConfig: GameConfig) {
    window.addEventListener('resize', () => {
        _resizeCanvas(gameConfig);
    });

    _resizeCanvas(gameConfig);
}

function _resizeCanvas(gameConfig: GameConfig) {

    if (!gameConfig) {
        _resizeCanvasFillscreen();
    } else if (gameConfig?.fillScreen) {
        _resizeCanvasFillscreen();
    } else {
        _resizeCanvasRatio(gameConfig);
    }
}

function _openFullscreen() {
    var canvasHolderEl = document.getElementById('renderCanvas-holder') as any;

    if (canvasHolderEl?.requestFullscreen) {
        canvasHolderEl?.requestFullscreen();
    } else if (canvasHolderEl?.mozRequestFullScreen) {
        /* Firefox */
        canvasHolderEl?.mozRequestFullScreen();
    } else if (canvasHolderEl?.webkitRequestFullscreen) {
        /* Chrome, Safari and Opera */
        canvasHolderEl?.webkitRequestFullscreen();
    } else if (canvasHolderEl?.msRequestFullscreen) {
        /* IE/Edge */
        canvasHolderEl?.msRequestFullscreen();
    }
}

function _resizeCanvasFillscreen() {
    var canvasEl = document.getElementById('renderCanvas');

    canvasEl?.setAttribute('style', `width: 100%; height: 100%;`);
}

function _resizeCanvasRatio(gameConfig: GameConfig) {

    var canvasHolderEl = document.getElementById('renderCanvas-holder') as any;
    var canvasEl = document.getElementById('renderCanvas');

    var offsetW = 15;
    var offsetH = 30;
    var canvasHolderH = canvasHolderEl?.offsetHeight;
    var canvasHolderW = canvasHolderEl?.offsetWidth;

    var maxHeight = canvasHolderW * (1 / gameConfig.screenRatio);
    var maxWidth = canvasHolderH * gameConfig.screenRatio;

    if (maxHeight > canvasHolderH - offsetH) {
        var width = (canvasHolderH - offsetH) * gameConfig.screenRatio;
        var height = canvasHolderH - offsetH;
        canvasEl?.setAttribute('style', `width: ${width}px; height: ${height}px;`);

    } else if (maxWidth > canvasHolderW - offsetW) {
        var width = (canvasHolderW - offsetW);
        var height = (canvasHolderW - offsetW) / gameConfig.screenRatio;
        canvasEl?.setAttribute('style', `width: ${width}px; height: ${height}px;`);
    }

    //_engine.resize();

}