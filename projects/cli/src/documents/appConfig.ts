import path from "path";
import fs from 'fs'
import chalk from "chalk";
import { fixGameName } from "../utils/ext";
import { isDebug } from "../utils/env";

export interface AppConfig {
    "gameName": string;
    "entryPoint": string;
    "fillScreen": boolean;
    "screenRatio": number;
    "gameThumbnail": string;
}

export async function getConfig(): Promise<AppConfig> {
    var res: { [id: string]: any; } =
    {
        "gameName": fixGameName(path.basename(path.resolve(process.cwd()))),
        "entryPoint": "./src/index.ts",
        "fillScreen": false,
        "screenRatio": 1.75,
    }

    try {

        var cwd = process.cwd();

        if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
            let rawdata = fs.readFileSync(path.resolve(cwd, 'frakas.json'));

            if (!rawdata) return <AppConfig>res;

            console.log("Found frakas.config, reading contents");

            let config = JSON.parse(rawdata.toString('utf-8'));

            if(isDebug()){
                console.log(`frakas.config:`, config);
            }

            for (const key in config) {
                if (Object.prototype.hasOwnProperty.call(config, key)) {
                    const element = config[key];
                    res[key] = element;
                }
            }

        }

    } catch (ex) {
        console.log(chalk.red(`${ex}`));
    }

    return <AppConfig>res;
}