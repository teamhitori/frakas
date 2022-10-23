import { EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { ISocketDocument } from '../documents/ISocketDocument';
import { Topic } from '../documents/Topic';
import { bufferTime, filter, map } from 'rxjs/operators';
import { IFrontendApi } from '../public';
import { FrontendContainer } from './FrontendContainer';
import { IHttpDocument } from '../documents/IHttpDocument';
import { post } from '../utils/http';


export class FrontendHttp {

  private _queueSendEvent: ReplaySubject<ISocketDocument> = new ReplaySubject();
  private _queueReceiveEvent: ReplaySubject<ISocketDocument> = new ReplaySubject();

  private _container: FrontendContainer;

  constructor(private _gamePrimaryName: string, private _remoteBackendUrl: string, assetsRoot: string) {

    // Create Http Connection.
    console.logD(`Connecting to http backend: ${_remoteBackendUrl}`);

    this._container = new FrontendContainer(assetsRoot);

    this._init();
  }

  public getFrontendApi(): IFrontendApi {
    return this._container.getFrontendApi();
  }

  private async _init() {

    var conectionRes = await this._pollFrakasConnection("", [<ISocketDocument>{
      topic: Topic.connect
    }])

    var connectionId = conectionRes[0].content;

    console.logD("connectionId: ", connectionId);

    this._queueSendEvent
      .pipe(
        filter(() => this._container.playerEntered),
        bufferTime(200))
      .subscribe(
        async message => {
          var socDocs = await this._pollFrakasConnection(connectionId, message);

          for (const doc of socDocs) {
            this._queueReceiveEvent.next(doc)
          }
        }
      );

    this._queueSendEvent.next(<ISocketDocument>{
      topic: Topic.ping,
      content: `Ping from ${connectionId}`
    });

    // Listen for messages
    this._queueReceiveEvent
      .subscribe(event => {
        console.logDiag(event.topic, event);

        switch (event.topic) {
          case Topic.connect:
            connectionId = event.content;
          case Topic.ping:
            break;
          case Topic.privateEvent:
            this._privateEvent(event);
            break;
          case Topic.publicEvent:
            this._publicEvent(event);
            break;
          case Topic.gameEnd:
            this._gameEnd();
            break;
        }
      });

    this._container.onPlayerEnter()
      .finally(() => {
        this._queueSendEvent.next(<ISocketDocument>{
          topic: Topic.playerEnter
        });

      });

    this._container.playerEventObservable()
      .pipe(bufferTime(100))
      .subscribe(doc => {
        this._queueSendEvent.next(<ISocketDocument>{
          topic: Topic.playerEvent,
          content: JSON.stringify(doc)
        });
      });

  }

  private async _pollFrakasConnection(connectionId: string, documents: ISocketDocument[]): Promise<ISocketDocument[]> {

    var httpDoc = <IHttpDocument>{
      connectionId: connectionId,
      gamePrimaryName: this._gamePrimaryName,
      socketDocuments: documents
    }

    var result = await post(`${this._remoteBackendUrl}/frakas-connection/`, JSON.stringify(httpDoc));

    return result as ISocketDocument[];
  }

  private _privateEvent(socketDoc: ISocketDocument) {

    this._container.privateEvent(socketDoc.content)
  }

  private _publicEvent(socketDoc: ISocketDocument) {

    this._container.publicEvent(socketDoc.content)
  }

  private _gameEnd() {
    this._container.onGameStop();
  }
}
