export interface IAssetFile {
  gameName: string
  storageUrl: string, 
  fileName: string, 
  sasToken: string,
  blob: Buffer, 
  contentType: string
}
