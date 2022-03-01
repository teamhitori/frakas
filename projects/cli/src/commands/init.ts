import express from 'express';
import chalk from 'chalk';
import * as yargs from 'yargs'
import path from 'path'
import fs from 'fs';
import { exec } from 'child_process'
import { AppConfig } from '../utils/documents/config';
import { Console } from 'console';

export async function init(appConfig: AppConfig) {

    var cwd = process.cwd();

    var run = (command: string, headline: string) => {
        console.log(chalk.whiteBright(headline));
        return new Promise(resolve => {
            exec(command, { cwd: cwd }, async (error, stdout, stderr) => {
                if (error) {
                    if(appConfig.verbose) console.log(chalk.yellow(`${error.message}`));
                    //return;
                }
                if (stderr) {
                    if(appConfig.verbose) console.log(chalk.yellow(`${stderr}`));
                    //return;
                }
                
                if(appConfig.verbose) console.log(chalk.gray(`${stdout}`));
    
                resolve({});
            });
        });
    }

    await run("npm init -y", "Initializing npm..");
    await run("npm i typescript -g", "Installing Typescript..");
    await run("tsc --init", "Initializing Typescript..");
    await run("npm i frakas", "Adding Frakas Dependencies..");

    await fs.promises.writeFile('frakas.json', config);
    await fs.promises.mkdir('src', { recursive: true });
    await fs.promises.writeFile('src/index.ts', code);
}

const config = 
`{
    "entryPoint": "src/index.ts",
    "ws-port": 10000,
    "port": 10001
}
`

const code = 
`import { setFrontend, setBackend } from 'frakas/api';

setFrontend(api => {
    var index = 0;

    console.log("user setFrontend called");

    api.onPrivateEvent()
        .subscribe((content) => {
            console.log(\`onPrivateEvent \${index++}\`, content);
        });

    api.onGameStop()
        .subscribe((playerPosition) => {
            console.log(\`onGameStop \${index++}\`, playerPosition);
        });

    api.onPublicEvent()
        .subscribe((playerPosition) => {
            console.log(\`onPublicEvent \${index++}\`, playerPosition);
        });

    api.sendToBackend({ content: "hello from front end" })
});

setBackend(api => {

    var index = 0;

    console.log("user setBackend called", api);

    api.onGameStart()
        .subscribe((content) => {
            console.log(\`onGameStart \${index++}\`, content);
        });

    api.onGameStop()
        .subscribe((content) => {
            console.log(\`onGameStop \${index++}\`, content);
        });

    api.onPlayerEnter()
        .subscribe((content) => {
            console.log(\`onPlayerEnter \${index++}\`, content);
        });

    api.onPlayerEvent<any>()
        .subscribe((content) => {
            console.log(\`onPlayerEvent \${index++}\`, content.playerPosition, content.playerState);

            api.sendToAll({ content: "Hello everyone from backend" });

            api.sendToPlayer({ playerPosition: content.playerPosition, playerState: { content: \`Hello player-\${content.playerPosition}\` } });
        });

    api.onPlayerExit()
        .subscribe((content) => {
            console.log(\`onPlayerExit \${index++}\`, content);
        });
});

`