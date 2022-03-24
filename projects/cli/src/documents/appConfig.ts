import path from "path";
import fs from 'fs'
import chalk from "chalk";

export interface AppConfig {
    "gameName": string;
    "entryPoint": string;
    "fillScreen": boolean;
    "screenRatio": number
}

export async function getConfig(): Promise<AppConfig> {
    var res: { [id: string]: any; } =
    {
        "gameName": path.basename(path.resolve(process.cwd())),
        "entryPoint": "./src/index.ts",
        "fillScreen": false,
        "screenRatio": 1.75
    }

    try {

        var cwd = process.cwd();

        if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
            let rawdata = fs.readFileSync(path.resolve(cwd, 'frakas.json'));

            if (!rawdata) return <AppConfig>res;

            console.log("Found frakas.config, reading contents");

            let config = JSON.parse(rawdata.toString('utf-8'))

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