import { readdir, readFile } from "fs/promises";
import glob from "fast-glob";
import { resolve } from "path";
import { getAccessToken } from "./login";
import { ICodeFile } from "../documents/ICodeFile";
import { existsSync, fstat } from "fs";
//import { AppConfig } from "../documents/appConfig";
import axios, { AxiosRequestConfig } from "axios";
import https from 'https';
import { IGameConfig } from "../documents/IGameConfig";
var os = require("os");
import { getStorageBase, getWebRoot, isDebug } from "../utils/env";
import { isValidGameName } from "../utils/ext";
import chalk from "chalk";
import * as mmm from 'mmmagic';
import { IAssetFile } from "../documents/IAssetFile";
import fs from 'fs';


export async function push(config: any) {

    if (!isValidGameName(config.gameName)) {
        console.log(chalk.red(`Invalid Game Name: ${config.gameName}`));
        return;
    }

    var publishedGameName = config.gameName.toLocaleLowerCase().split(" ").join("-");

    var ignore = [`node_modules`,`bin`,`obj`,`build`];

    if(fs.existsSync(".frignore")) {
        var ignoreContents = await readFile(".frignore");
        ignore = ignoreContents.toString().split(os.EOL);
    }
    
    var token = await getAccessToken();

    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    var authHeader = {
        Authorization: `Bearer ${token}`
    };

    var webConfig:AxiosRequestConfig = {
        headers: authHeader,
        httpsAgent: agent,
        timeout: 60000
    };

    var webRoot = getWebRoot();
    var storageBase = getStorageBase();

    var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
    var getMime = async (file: string) => new Promise((resolve, reject) => {
        magic.detectFile(file, function (err, result) {
            if (err) {
                if (isDebug()) {
                    console.log(chalk.red(err));
                    reject(err);
                }
                return;
            }
            // debug
            //console.log(result);
            resolve(result)
        });
    });

    var username = await axios.get(`${webRoot}/api/editorApi/get-username`, webConfig).then(res => {
        //console.log("get-username", res);
        if (res.status >= 200 && res.status < 300 && res.data.length < 200)
            return res.data;

        fs.writeFileSync(`${process.cwd()}/resp.html`, res.data);
        return null;
    });

    if (!username) {
        console.log(chalk.red(`Huston we're having problems with access token, exiting..`));
        return;

    }
    console.log(`They call me ${username}`);

    var sasToken = await axios.get(`${webRoot}/api/editorApi/get-token/${publishedGameName}`, webConfig).then(res => {
        //console.log("get-token", res);
        if (res.status >= 200 && res.status < 300 && res.data.length < 200)
            return res.data;

        fs.writeFileSync(`${process.cwd()}/resp.html`, res.data);
        return null;
    });

    // debug

    if (!sasToken) {
        console.log(chalk.red(`This sasToken looks hmm.. exiting..`));
        return;
    }

    //console.log(`sasToken:${sasToken}`);

    ignore = ignore.filter(s => s);

    //console.log(ignore);

    const paths = await glob(['**', '!cake'], { followSymbolicLinks: false, globstar: true, ignore: ignore });

    var codeFiles = [];
    var assetFiles: IAssetFile[] = []

    for (const path of paths) {
        var split = path.split("/");
        var fileName = split[split.length - 1];
        if (existsSync(path)) {
            console.log(chalk.gray(`Uploading: ${path}`));

            var content = await readFile(path);

            if (path.startsWith(`assets/`)) {
                var data = fs.readFileSync(path)

                assetFiles.push(<IAssetFile>{
                    blob: data,
                    contentType: await getMime(path),
                    fileName: path,
                    gameName: publishedGameName,
                    storageUrl: `${storageBase}/${username}-${publishedGameName}`,
                    sasToken: sasToken
                })


            } else {
                codeFiles.push(<ICodeFile>{
                    code: content.toString(),
                    fileName: path,
                    gameName: config.gameName
                });
            }
        }
    }

    var gameConfig = <IGameConfig>{
        gameName: config.gameName,
        fillScreen: config.fillScreen,
        screenRatio: config.screenRatio,
        codeFileNames: codeFiles.map(f => f.fileName),
        gameThumbnail: config.gameThumbnail ?? ""
    }

    await axios.post(`${getWebRoot()}/api/editorApi/upsert-config/${publishedGameName}`, gameConfig, webConfig)
        .then(function (response) {
            // handle success
            console.log(`Code push complete`);

            return response.data;
        })
        .catch(function (error) {
            // handle error
            if(isDebug()){
                console.log(`Error upsert-config`, error);
            }
            console.log("There was a problem uploading config, exiting");
            process.exit(0);
        });

    await axios.post(`${webRoot}/api/editorApi/upsert-code/${publishedGameName}`, codeFiles, webConfig)
        .then((response) => {
            // handle success
            console.log(`Code push complete`);

            return response.data;
        })
        .catch(function (error) {
            // handle error
            if(isDebug()){
                console.log(`Error upsert-code`, error);
            }
            console.log("There was a problem uploading code, exiting");
            process.exit(0);
        });

    for (const file of assetFiles) {
        await uploadFile(file)
    }

    var pollBuild = async () => {
        var isbuilding = await (await axios.get(`${webRoot}/api/editorApi/poll-build/${publishedGameName}`, webConfig)).data;

        return isbuilding;
    }

    var spinner = ["|", "/", "-", "\\"];
    var spinInc = 0;

    console.log("Remote Build in progress");

    while (await pollBuild()) {

        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(spinner[spinInc % 4]);

        spinInc++

        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log("Remote Build Complete");
}

async function uploadFile(file: IAssetFile) {
    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    var config: AxiosRequestConfig = {
        onUploadProgress: function (progressEvent) {
            var percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            process.stdout.cursorTo(0);
            process.stdout.write(`File is ${percentCompleted}% uploaded.`);
        },
        headers: {
            'Content-Type': file.contentType,
            'x-ms-blob-type': 'BlockBlob'
        },
        httpsAgent: agent
    };

    console.log(`Uploading ${file.storageUrl}/${file.fileName}`);
    process.stdout.write(`File is 0% uploaded.`);


    await axios.put(`${file.storageUrl}/${file.fileName}${file.sasToken}`, file.blob, config)
        .then(function (response) {
            // handle success
            console.log(`Request Successful`);

            return response.data;
        })
        .catch(function (error) {
            // handle error
            console.log(`Error upsert-code`, error);
        });

    return true;
}


// function addUploadImageBinary(blob: Blob, imageType: string): Observable<string> {

//     var retObservable = new Subject<string>();

//     _uploadActionList.push(uploadAction);

//     triggerUpload();

//     return retObservable;
// }

// async function uploadAction() {
//     _isIdle = false;
//     var thisIndex = _increment++;
//     this.uploadList[thisIndex] = 0;

//     const headers = new HttpHeaders()
//         .set('Content-Type', imageType)
//         .set('x-ms-blob-type', 'BlockBlob');

//     var buffer = await blob.arrayBuffer()
//     const imgHash = await cryptohash.sha256(buffer)

//     //const req = new HttpRequest('POST', 'api/image', JSON.stringify(imageStr), { headers: headers, reportProgress: true });

//     console.log(`upload: ${this.storageBase}/${liveDefinitionGrid.livePrimaryName}/${imgHash}`);

//     const req2 = new HttpRequest(
//         'PUT',
//         `${this.storageBase}/${liveDefinitionGrid.livePrimaryName}/${imgHash}${liveDefinitionGrid.meta["ESaSToken"]}`,
//         blob,
//         { headers: headers, reportProgress: true });

//     this.http.request(req2).pipe(
//         tap(event => {
//             switch (event.type) {
//                 case HttpEventType.Sent:
//                     console.log(`Uploading file.`);
//                     break;
//                 case HttpEventType.UploadProgress:
//                     // Compute and show the % done:
//                     const percentDone = Math.round(100 * event.loaded / event.total);
//                     console.log(`File is ${percentDone}% uploaded.`);
//                     this.uploadList[thisIndex] = percentDone;
//                     break;
//                 case HttpEventType.Response:
//                     console.log(`File was completely uploaded!`);
//                     delete this.uploadList[thisIndex]
//                     break;
//                 default:
//                     console.log(`File surprising upload event: ${event.type}.`);
//                     delete this.uploadList[thisIndex]
//             }
//         }),
//         last()
//     )
//         .subscribe((response: any) => {
//             retObservable.next(imgHash);
//             delete this.uploadList[thisIndex]

//         }, ex => {
//             console.log(ex);
//             retObservable.complete();
//             this._isIdle = true;
//             this.triggerUpload()

//         }, () => {
//             retObservable.complete();
//             this._isIdle = true;
//             this.triggerUpload()
//         });

// }

// async function triggerUpload() {

//     if (!this._isIdle || this._uploadActionList.length == 0) return;

//     var nextAction = this._uploadActionList.pop()

//     nextAction()
// }