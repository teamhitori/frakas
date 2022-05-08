// theirs
import express from "express";
import { v4 as uuidv4 } from 'uuid';
import path from 'path'
import chalk from "chalk";

// mine
import { AppConfig } from "../documents/appConfig";
import { args } from "../documents/args";


export function startWeb(appconfig: AppConfig, root: string, argv: args) {
    const app = express();
    app.listen(argv.port);

    app.use(express.static('public'));

    app.get('/favicon.ico', function (req, res) {
        res.sendFile(path.resolve(root, 'favicon.ico'));
    });

    console.log(`argv.staticPath: ${argv.staticPath}`);

    app.use(express.static(argv.staticPath));

    console.log(chalk.blue(`Webpage on port http://localhost:${argv.port}`));
}

