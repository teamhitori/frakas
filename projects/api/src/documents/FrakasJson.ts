import fs from 'fs'

export interface FrakasJson {
    "gameName": string;
    "entryPoint": string;
    "fillScreen": boolean;
    "screenRatio": number;
    "gameThumbnail": string;
    "webPort": number;
    "clientDir": string;
    "serverDir": string;
    "remoteHost": string;
}

export function getFrakasJson(): FrakasJson {
    let rawdata = fs.readFileSync('frakas.json');

    if (!rawdata) {
        throw Error('required file: frakas.json not found')
    }

    let config = JSON.parse(rawdata.toString('utf-8'));

    return config;
}
