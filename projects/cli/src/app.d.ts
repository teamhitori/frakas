declare module NodeJS {
    interface Global {
        connectBackend: (backendApi: IBackendApi) => void
    }
  }