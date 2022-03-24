import { readdir, readFile } from "fs/promises";
import glob from "fast-glob";
import { resolve } from "path";
import { getAccessToken } from "./login";
import { ICodeFile } from "../documents/ICodeFile";
import { existsSync, fstat } from "fs";
import { AppConfig } from "../documents/appConfig";
import axios from "axios";
import https from 'https';
import { IGameConfig } from "../documents/IGameConfig";
var os = require("os");



export async function push(config: AppConfig) {

    var ignoreContents = await readFile(".frignore");
    var ignore = ignoreContents.toString().split(os.EOL)

    ignore = ignore.filter(s => s);

    console.log(ignore);

    const paths = await glob(['**', '!cake'], { followSymbolicLinks: false, globstar: true, ignore: ignore });

    console.log(paths)

    var codeFiles = [];

    for (const file of paths) {
        if (existsSync(file)) {
            var content = await readFile(file);

            codeFiles.push(<ICodeFile>{
                code: content.toString(),
                fileName: file,
                gameName: config.gameName
            });
        }

    }

    var token = await getAccessToken();

    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    await axios.post('https://localhost:8001/api/editorApi/upsert-code',
        codeFiles,
        {
            headers: {
                Authorization: `Bearer ${token}`
            },
            httpsAgent: agent
        })
        .then(function (response) {
            // handle success
            console.log(`Request Successful`);

            return response.data;
        })
        .catch(function (error) {
            // handle error
            console.log(`Error upsert-code`, error);
        });

    var gameConfig = <IGameConfig>{
        gameName: config.gameName,
        fillScreen: config.fillScreen,
        screenRatio: config.screenRatio,
        codeFileNames: codeFiles.map(f => f.fileName)
    }

    await axios.post(`https://localhost:8001/api/editorApi/upsert-config/${config.gameName}`,
        gameConfig,
        {
            headers: {
                Authorization: `Bearer ${token}`
            },
            httpsAgent: agent
        })
        .then(function (response) {
            // handle success
            console.log(`Request Successful`);

            return response.data;
        })
        .catch(function (error) {
            // handle error
            console.log(`Error upsert-config`, error);
        });

}

async function getFiles(dir: string): Promise<string[]> {
    const dirents = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}