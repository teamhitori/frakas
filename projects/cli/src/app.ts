import express from 'express';
import chalk from 'chalk';
import * as figlet from 'figlet';
import * as yargs from 'yargs'
import path from 'path'
import fs from 'fs';

import { exec, spawn } from 'child_process'

// mine
import { build, getConfig } from './utils/buildExt'

declare const connectBackend: (backendApi: any) => void;

console.log(
    chalk.yellowBright(
        figlet.textSync('FRAKAS', { horizontalLayout: 'full' })
    )
);

let rawdata = fs.readFileSync(path.join(__dirname, 'version.json'));
let versionConfig = JSON.parse(rawdata.toString());

console.log(
    chalk.yellow(
        `v: ${versionConfig.version}`
    )
);


var runAsync = async () => {

    const options = await yargs
        .usage("Usage: frakas serve")
        .command("serve", "Serve game instance using locally running backend server", () => { }, async (argv) => {
            console.info(`start server on :${argv.port}`);

            console.log(chalk.blue("Build Started"));

            var appConfig = await getConfig();
            
            if(argv.port) appConfig.port = argv.port as number;
            if(argv["ws-port"]) appConfig['ws-port'] = argv["ws-port"] as number;
            if(argv.entryPoint) appConfig.entryPoint = argv.entryPoint as string;

            var cwd = process.cwd();
            var entrypoint = path.resolve(cwd, appConfig.entryPoint);

            console.log(`Entrypoint: ${entrypoint}`);

            fs.rmSync("obj", {force: true, recursive: true});

            await build(cwd, "web", entrypoint, argv.verbose);
            await build(cwd, "node", entrypoint, argv.verbose);

            const app = express();
            var server = app.listen(appConfig.port);

            var be = spawn("node", [path.resolve("obj", "node.bundle.js"), "--port", `${appConfig["ws-port"]}`], { cwd: cwd });

            be.stdout.on("data", (data: any) => {
                console.log(chalk.gray(data)); 
            });

            be.stderr.on("data", data => {
                console.log(chalk.gray(data)); 
            });
    
            be.on('error', (error) => {
                console.log(chalk.red(error)); 
            });
    
            be.on("close", async code => {
                console.log(chalk.blue("Backend has exited")); 
                server.close()
            });

            app.get('/', (req, res) => {
                console.log("called /");
                res.setHeader("Content-Type", "text/html");
                res.send(`<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="X-UA-Compatible" content="ie=edge">
                    <title>Frakas Debugger</title>
                </head>
                <body>
                  <input type="hidden" value="ws://localhost:${appConfig['ws-port']}/ws" id="ws-url" />
                  <input type="hidden" value="${appConfig['ws-port']}" id="ws-port" />
                  <div #canvasHolder class="cavas-holder-inner">
                    <canvas tabindex="0" autofocus width="2000" id="renderCanvas"></canvas>
                  </div>
                  <script type="text/javascript" src="web.bundle.js"></script>
                </body>
                </html>`);
            });

            // -- Express

            app.use(express.static('obj'));

            console.log(chalk.blue(`listening on port http://localhost:${appConfig.port}`));
        })
        .argv;

}

runAsync()




