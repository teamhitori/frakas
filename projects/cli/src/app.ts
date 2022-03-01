import express from 'express';
import chalk from 'chalk';
import * as figlet from 'figlet';
import * as yargs from 'yargs'
import path from 'path'
import fs from 'fs';

// mine
import { serve } from './commands/serve';
import { init } from './commands/init'

// mine
import { getConfig } from './utils/buildExt'

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
    .command("init", "Initialize Frakas", () => { }, async (argv) => {

        var appConfig = await getConfig(argv);
        await init(appConfig);
    })
    .command("serve", "Serve game instance using locally running backend server", () => { }, async (argv) => {

        var cwd = process.cwd();
        if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
            console.log(chalk.green(`${path.resolve(cwd, 'frakas.json')} exists`));
        } else {
            console.log(chalk.yellow(`${path.resolve(cwd, 'frakas.json')} does not exist`));
        }
        var appConfig = await getConfig(argv);
        await serve(__dirname, appConfig);
    })
    .argv;




