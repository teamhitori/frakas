import { IBackendApi } from './api'
 
declare module NodeJS {
    interface Global {
        connectBackend: (backendApi: IBackendApi) => void
    }
  }