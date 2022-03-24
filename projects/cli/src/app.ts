import express from 'express';
import chalk from 'chalk';
import * as figlet from 'figlet';
import * as yargs from 'yargs'
import path from 'path'
import fs from 'fs';

// mine
import { serve } from './commands/serve';
import { init } from './commands/init'
import { clearCache, login } from './commands/login';
import { async } from 'rxjs';
import { push } from './commands/push';
import { getConfig } from './documents/appConfig';
import { listGames } from './commands/listGames';
import { buildAll } from './commands/build';



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


yargs
    .usage("Usage: frakas serve")
    .option("verbose", { alias: "v", describe: "verbose logging", type: 'boolean', default: false })
    .option("port", { alias: "p", describe: "Port Number when running Frakas locally", type: 'number', default: 10001 })
    .option("ws-port", { alias: "s", describe: "Websocket port number when running Frakas locally", type: 'number', default: 10000 })
    .command("init", "Initialize Frakas", () => { }, async (argv) => {
        await init(argv);
    })
    .command("login", "Log onto Frakas platform", () => { }, async (argv) => {
        await login();
    })
    .command("serve", "Serve game instance using locally running backend server", () => { }, async (argv) => {

        var cwd = process.cwd();
        if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
            console.log(chalk.green(`${path.resolve(cwd, 'frakas.json')} exists`));
        } else {
            console.log(chalk.yellow(`${path.resolve(cwd, 'frakas.json')} does not exist`));
        }
        var appConfig = await getConfig();
        await serve(appConfig, __dirname, argv);
    })
    .command("build", "build source code", () => { }, async (argv) => {

        var cwd = process.cwd();
        if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
            console.log(chalk.green(`${path.resolve(cwd, 'frakas.json')} exists`));
        } else {
            console.log(chalk.yellow(`${path.resolve(cwd, 'frakas.json')} does not exist`));
        }
        var appConfig = await getConfig();
        await buildAll(appConfig, __dirname, argv);
    })
    .command("push", "Push local files to Frakas Platform (requires login)", () => { }, async (argv) => {

        var appConfig = await getConfig();
        await push(appConfig);
    })
    .command("list-games", "List all of my games on Frakas Platform (requires login)", () => { }, async (argv) => {
        await listGames();
    })
    .command("clear-token", "Clear token cache", () => { }, async (argv) => {
        await clearCache();
    })
    .argv;




