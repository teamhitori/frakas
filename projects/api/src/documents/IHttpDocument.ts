import { ISocketDocument } from "./ISocketDocument";

export interface IHttpDocument {
    connectionId: string,
    gamePrimaryName: string,
    socketDocuments: ISocketDocument[]
}