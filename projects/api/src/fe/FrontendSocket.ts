import { bufferTime, filter, ReplaySubject } from 'rxjs';
import { ISocketDocument } from '../documents/ISocketDocument';
import { Topic } from '../documents/Topic';
import { IFrontendApi, IOptions } from '../public';
import { FrontendContainer } from './FrontendContainer';


export class FrontendSocket {

  private _socket: WebSocket | undefined = undefined;
  private _queueEvent: ReplaySubject<ISocketDocument> = new ReplaySubject();
  private _container: FrontendContainer;

  constructor(
    private _socketBase: string,
    private _remoteHttpBase: string,
    private _assetsRoot: string,
    private _options: IOptions | undefined = undefined) {
    this._container = new FrontendContainer(this._assetsRoot)

    this._init();
  }

  private async _init() {
    // Create WebSocket connection.
    console.logDebug(`Connecting to: ${this._socketBase}`);

    this._socket = new WebSocket(`${this._socketBase}`);

    // Connection opened
    this._socket.addEventListener('open', event => {
      this._queueEvent.subscribe(
        message => {
          this._socket?.send(JSON.stringify(message));
        }
      );
    });

    this._socket.addEventListener('close', event => {
      this._queueEvent.subscribe(
        message => {
          console.logW("Websocket Closed")
          this._socket = undefined;
        }
      );
    });

    this._queueEvent.next(<ISocketDocument>{
      topic: Topic.ping,
      content: "Ping!!"
    });

    // Listen for messages
    this._socket.addEventListener('message', event => {

      var doc = JSON.parse(event.data) as ISocketDocument;

      if (!doc) return;

      switch (doc.topic) {
        case Topic.ping:
          console.logDebug(doc);
          break;
        case Topic.privateEvent:
          this._privateEvent(doc);
          break;
        case Topic.publicEvent:
          this._publicEvent(doc);
          break;
        case Topic.gameEnd:
          this._gameEnd();
          break;
      }
    });

    this._container.onPlayerEnter()
      .finally(() => {
        this._queueEvent.next(<ISocketDocument>{
          topic: Topic.playerEnter
        });
      });


    this._container.playerEventObservable()
      .pipe(
        filter(() => this._container!!.playerEntered),
        bufferTime(100),
        filter(n => n.length > 0)
      )
      .subscribe(doc => {
        this._queueEvent.next(<ISocketDocument>{
          topic: Topic.playerEvent,
          content: JSON.stringify(doc)
        });
      });
  }

  public getFrontendApi(): IFrontendApi {
    return this._container.getFrontendApi();
  }

  private _privateEvent(socketDoc: ISocketDocument) {

    this._container!!.privateEvent(socketDoc.content)
  }

  private _publicEvent(socketDoc: ISocketDocument) {

    this._container!!.publicEvent(socketDoc.content)
  }

  private _gameEnd() {
    this._container!!.onGameStop();
  }
}
