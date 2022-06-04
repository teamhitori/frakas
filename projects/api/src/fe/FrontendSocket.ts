import { bufferTime, filter, ReplaySubject } from 'rxjs';
import { ISocketDocument } from '../documents/ISocketDocument';
import { Topic } from '../documents/Topic';
import { IFrontendApi } from '../public';
import { PlayerContainer } from './PlayerContainer';


export class FrontendSocket {

  private _socket: WebSocket | undefined = undefined;
  private _queueEvent: ReplaySubject<ISocketDocument> = new ReplaySubject();
  private _container: PlayerContainer | undefined = undefined;

  constructor(private _socketBase: string, private _remoteHttpBase: string, private _assetsRoot: string, private _feCallback: (n: IFrontendApi) => any) {
   
    this._init();

  }

  private async _init() {
     // Create WebSocket connection.
     console.log(`Connecting to: ${this._socketBase}`);
 
     this._socket = new WebSocket(`${this._socketBase}`);
 
     this._container = new PlayerContainer(this._assetsRoot, this._feCallback)
 
     // Connection opened
     this._socket.addEventListener('open', event => {
       this._queueEvent.subscribe(
         message => {
           this._socket?.send(JSON.stringify(message));
         }
       );
     });
 
     this._queueEvent.next(<ISocketDocument>{
       topic: Topic.ping,
       content: "Drink!!"
     });
 
     // Listen for messages
     this._socket.addEventListener('message', event => {
 
       var doc = JSON.parse(event.data) as ISocketDocument;
 
       if (!doc) return;
 
       switch (doc.topic) {
         case Topic.ping:
           console.log(doc);
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
