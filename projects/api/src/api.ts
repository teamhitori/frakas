import { Observable } from 'rxjs';
export interface PlayerEventContent {
    playerPosition: number;
    playerState: any;
}
export interface IBackEndApi {
    setPlayerEvent(playerEventContent: PlayerEventContent): void;
    pushGameState(state: any): void;
    onPlayerEvent(): Observable<PlayerEventContent>;
    onGameLoop(): Observable<void>;
    onPlayerEnter(): Observable<number>;
    onPlayerExit(): Observable<number>;
    onGameStop(): Observable<void>;
    onGameStart(): Observable<void>;
}
export interface IFrontEndApi {
    sendToBackend(state: any): void;
    onPrivateEvent(): Observable<any>;
    onPublicEvnet(): Observable<any>;
    onGameStop(): Observable<any>;
}
export interface IBackEndApi {
    sendToPlayer(playerEventContent: PlayerEventContent): void;
    sendToAll(state: any): void;
    onPlayerEvent(): Observable<PlayerEventContent>;
    onGameLoop(): Observable<void>;
    onPlayerEnter(): Observable<number>;
    onPlayerExit(): Observable<number>;
    onGameStop(): Observable<void>;
    onGameStart(): Observable<void>;
}