import { EMPTY, Observable, ReplaySubject, Subject } from 'rxjs';
import { ISocketConnectedDocument } from '../documents/ISocketConnectedDocument';
import { Topic } from '../documents/Topic';
import { map } from 'rxjs/operators';


export class FeWebsocket {

  private _socket: WebSocket;
  private _queueEvent: ReplaySubject<ISocketConnectedDocument> = new ReplaySubject();
  private _playerEnterSubject: Subject<ISocketConnectedDocument> = new Subject();
  private _playerEventSubject: Subject<ISocketConnectedDocument> = new Subject();
  private _gameLoopSubject: Subject<ISocketConnectedDocument> = new Subject();
  private _metricsSubject: Subject<ISocketConnectedDocument> = new Subject();

  constructor(socketBase: string) {
    // Create WebSocket connection.
    console.log(`Connecting to: ${socketBase}`);
    this._socket = new WebSocket(`${socketBase}`);

    // Connection opened
    this._socket.addEventListener('open', event => {
      this._queueEvent.subscribe(
        request => {
          this._socket.send(JSON.stringify(request));
        }
      );
    });

    this._queueEvent.next(<ISocketConnectedDocument>{
      topic: Topic.ping,
      content: "Drink!!"
    });

    // Listen for messages
    this._socket.addEventListener('message', event => {

      var doc = JSON.parse(event.data) as ISocketConnectedDocument;

      //console.log('Message from server ', doc?.topic);

      switch (doc.topic) {
        case Topic.ping:
          console.log(doc);
          break;
        case Topic.playerEnter:
          this._playerEnterSubject.next(doc);
          break;
        case Topic.playerEventOut:
          this._playerEventSubject.next(doc);
          break;
        case Topic.gameLoop:
          this._gameLoopSubject.next(doc);
          break;
        case Topic.metrics:
          this._metricsSubject.next(doc);
          break;
        case Topic.gameEnd:
          this._gameLoopSubject.complete();
          break;
      }
    });
  }

  public enterGame(): Observable<string> {
    var subject = new Subject<string>();

    // need sychronicity

    setTimeout(async () => {

      this._onPlayerEvent()
        .subscribe(
          message => {
            subject.next(message);
          },
          ex => {
            subject.error(ex);
          },
          () => {
            subject.complete();
          });

      this._queueEvent.next(<ISocketConnectedDocument>{
        topic: Topic.playerEnter
      });

    }, 0);

    return subject;
  }

  public playerEventIn(data: any) {

    this._queueEvent.next(<ISocketConnectedDocument>{
      topic: Topic.playerEventIn,
      content: JSON.stringify(data)
    });

  }

  public startGame(): Observable<string> {
    var subject = new Subject<string>();
    this._gameLoopSubject = new Subject();

    setTimeout(async () => {

      this._gameLoopSubject
        .pipe(map(event => {
          return event.content
        }))
        .subscribe(
          message => {
            subject.next(message);
          },
          ex => {
            subject.error(ex);
          },
          () => {
            subject.complete();
          });

      this._queueEvent.next(<ISocketConnectedDocument>{
        topic: Topic.startGame
      });

    }, 0);

    return subject;
  }

  public onMetrics(): Observable<string> {

    var subject = new Subject<string>();

    this._metricsSubject
      .pipe(map(event => {
        return event.content
      }))
      .subscribe(
        message => {
          subject.next(message);
        },
        ex => {
          subject.error(ex);
        },
        () => {
          subject.complete();
        });

    return subject;

  }

  private _onPlayerEvent(): Observable<string> {

    var subject = new Subject<string>();

    setTimeout(async () => {

      this._playerEventSubject
        .pipe(map(event => {
          return event.content
        }))
        .subscribe(
          message => {
            subject.next(message);
          },
          ex => {
            subject.error(ex);
          },
          () => {
            subject.complete();
          });

    }, 0);

    return subject;
  }

}
