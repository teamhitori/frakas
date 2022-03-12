import express from 'express';
import chalk from 'chalk';
import path from 'path'
import fs from 'fs';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { v4 as uuidv4 } from 'uuid';

// mine
import { build } from '../utils/buildExt'
import { AppConfig } from '../documents/appConfig';


export async function serve(root: string, appConfig: AppConfig) {
    console.info(`start server on :${appConfig.port}`);

    console.log(chalk.blue("Watch Started"));

    var cwd = process.cwd();
    var entrypoint = path.resolve(cwd, appConfig.entryPoint);

    console.log(`Entrypoint: ${entrypoint}`);

    fs.rmSync("obj", { force: true, recursive: true });



    const app = express();
    var server = app.listen(appConfig.port);

    var verboseTag = appConfig.verbose ? "-v" : "";

    var spawnBackend = () => {
        var be = spawn("node", [path.resolve("obj", "node.bundle.main.js"), "--port", `${appConfig["ws-port"]}`, verboseTag], { cwd: cwd });

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
            console.log(chalk.blue("Backend has stopped"));
        });

        return be;

    }

    app.use(express.static('public'));

    app.get('/favicon.ico', function (req, res) {
        res.sendFile(path.resolve(root, 'favicon.ico'));
    });

    var clients: { [name: string]: any } = {}

    app.get('/subscribe', (req, res) => {
        // send headers to keep connection alive
        const headers = {
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
        };
        res.writeHead(200, headers);

        var clientId = uuidv4();

        console.log(`Subscribe called by client: ${clientId}`);

        // send client a simple response
        res.write('you are subscribed');

        

        // store `res` of client to let us send events at will
        clients[clientId] = res;

        // listen for client 'close' requests
        req.on('close', () => { delete clients[clientId] });
    });

    app.use(express.static('obj'));

    // send refresh event (must start with 'data: ')
    var sendRefresh = () => {

        for (const key in clients) {
            if (Object.prototype.hasOwnProperty.call(clients, key)) {
                const client = clients[key];

                console.log("Sending Refresh to client: ", key);

                client?.write('data: refresh');
            }
        }
    }

    console.log(chalk.blue(`listening on port http://localhost:${appConfig.port}`));

    await build(cwd, "web", entrypoint, appConfig, () =>{

    }, () => {
        sendRefresh()
    });

    var currentBe: ChildProcessWithoutNullStreams | undefined = undefined;

    await build(cwd, "node", entrypoint, appConfig, () =>{
        currentBe?.kill(9);
    }, () => {
        currentBe = spawnBackend();
    });
}
