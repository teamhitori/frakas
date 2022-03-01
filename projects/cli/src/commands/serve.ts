import express from 'express';
import chalk from 'chalk';
import * as yargs from 'yargs'
import path from 'path'
import fs from 'fs';
import { exec, spawn } from 'child_process'

// mine
import { build } from '../utils/buildExt'
import { AppConfig } from '../utils/documents/config';

export async function serve(root: string, appConfig: AppConfig){
    console.info(`start server on :${appConfig.port}`);

            console.log(chalk.blue("Build Started"));

            var cwd = process.cwd();
            var entrypoint = path.resolve(cwd, appConfig.entryPoint);

            console.log(`Entrypoint: ${entrypoint}`);

            fs.rmSync("obj", {force: true, recursive: true});

            await build(cwd, "web", entrypoint, appConfig.verbose);
            await build(cwd, "node", entrypoint, appConfig.verbose);

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
                res.send(getHtml(appConfig['ws-port']));
            });

            app.get('/favicon.ico', function (req, res) {
                res.sendFile(path.resolve(root, 'favicon.ico'));
            });

            // -- Express

            app.use(express.static('obj'));

            console.log(chalk.blue(`listening on port http://localhost:${appConfig.port}`));
}

const getHtml = (wsport: number)=> {return  `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Frakas Debugger</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
    <style>
        #renderCanvas {
            touch-action: none;
            position: relative;
            top: 0px;
            bottom: 0px;
            max-width: 100%;
            margin: auto auto;
            border: 1px solid white;
            background-color: #383838;
            height: 100%;
        }
        
        #renderCanvas.active {
            //cursor: none;
        }
        
        .cavas-holder-inner {
            padding: 16px;
            width: 100%;
            height: 100%;
            display: flex;
            position: absolute;
            background-color: #585858;
        }
    </style>
</head>
<body>
  <input type="hidden" value="ws://localhost:${wsport}/ws" id="ws-url" />
  <input type="hidden" value="${wsport}" id="ws-port" />
  <div class="cavas-holder-inner">
    <canvas tabindex="0" autofocus width="2000" id="renderCanvas"></canvas>
  </div>
  <script type="text/javascript" src="web.bundle.js"></script>
</body>
</html>`;}