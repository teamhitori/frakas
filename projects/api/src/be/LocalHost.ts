import express from "express";
import { getFrakasJson } from "../documents/FrakasJson";
import path from "path";
import chalk from 'chalk';

export async function createLocalHost(useRemote: boolean){
    var config = getFrakasJson();

    var app = express();

    var clientDir = config.clientDir ?? 'public';
    var query = useRemote ? "" : '?remote-host=false';
    var hostName =  `http://localhost:${config.webPort}${query}`;

    console.logI(`static dir: ${clientDir}`)

    app.use(express.static( config.clientDir ?? 'public'));

    app.get('/favicon.ico', function (req, res) {
        res.sendFile(path.resolve(clientDir, 'favicon.ico'));
    });

    app.use(express.static(clientDir));

    console.logI(chalk.blue(`Serving page on ${hostName}`));    

    return app;
}