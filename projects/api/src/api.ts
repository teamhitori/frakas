import { Observable } from 'rxjs';

export interface PlayerEventContent<T> {
    playerPosition: number;
    playerState: T;
}

export interface IFrontendApi {
    sendToBackend<T>(state: T): void;
    onPrivateEvent<T>(): Observable<T>;
    onPublicEvent<T>(): Observable<T>;
    onGameStop<T>(): Observable<T>;
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

        var elGamePrimaryName = document.getElementById('game-primary-name');
        var gamePrimaryName = (<HTMLInputElement>elGamePrimaryName)?.value;

        if(gamePrimaryName) {
            wsUrl = `${wsUrl}/${gamePrimaryName}`;
        }

        console.log(`ws-url:${wsUrl}`);
        console.log(`fill-screen:${fill}`);
        console.log(`screen-ratio:${ratio}`);

        _setupGameWindow(fill, ratio);

        var { FeWebsocket } = require('./fe/feWebsocket');
        var { PlayerContainer } = require('./fe/playerContainer');

        var feWebsocket = new FeWebsocket(`${wsUrl}`);

        // console.log(`Create EventSource`);

        // var evtSource = new EventSource("/subscribe");

        // evtSource.onmessage = function () {
        //     window.location.reload();
        // };

        new PlayerContainer(feWebsocket, feCallback);
    })
}

export function setBackend(beCallback: (n: IBackendApi) => any) {

    if (typeof process === 'object') {
        var runAsync = async () => {

            const { BeWebsocket } = require('./be/beWebsocket');

            var port = process.argv[2];

            console.log("beCallback called");
            console.log(`args`, port);

            new BeWebsocket(port, beCallback);
        }
        runAsync()
    }
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