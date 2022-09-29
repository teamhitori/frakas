import express from 'express';
import chalk from 'chalk';
import * as figlet from 'figlet';
import * as yargs from 'yargs'
import path from 'path';
import fs from 'fs';

// mine
import { getFrakasJson } from '@frakas/api/documents/FrakasJson'
import { init } from './commands/init'
import { clearCache, login } from './commands/login';
import { push } from './commands/push';
import { listGames } from './commands/listGames';
import { buildWebpack } from './utils/webpack';
import { build } from './commands/buildv3';
import { serve } from './commands/serve';
import { up } from './commands/up';


console.log(
    chalk.yellowBright(
        figlet.textSync('FRAKAS', { horizontalLayout: 'full' })
    )
);

let rawdata = fs.readFileSync(path.join(__dirname, 'package.json'));
let versionConfig = JSON.parse(rawdata.toString());

console.log(
    chalk.yellow(
        `CLI version: ${versionConfig.version}`
    )
);


yargs
    .option("verbose", { alias: "v", describe: "verbose logging", type: 'boolean', default: false })
    .command("init", "Initialize Frakas",
        (yargs) => yargs
            .positional("webpack-config", { alias: "c", describe: "Webpack config file name", type: 'string', default: 'webpack.config.js' })
            .positional("verbose", { alias: "v", describe: "verbose logging", type: 'boolean', default: false })
            .positional("dry-run", { alias: "d", describe: "dry run", type: 'boolean', default: false })
        , async (argv) => {
            await init(argv);
        })
    .command("login", "Log onto Frakas platform", () => { }, async (argv) => {
        await login();
    })
    .command("serve", "Build, watch and serve game instance using locally running backend server",
        (yargs) => yargs
            .positional("webpack-config", { alias: "c", describe: "Webpack config file name", type: 'string', default: 'webpack.config.js' })
            .positional("verbose", { alias: "v", describe: "verbose logging", type: 'boolean', default: false })
            .positional("dry-run", { alias: "d", describe: "dry run", type: 'boolean', default: false })
        ,
        async (argv) => {
            var cwd = process.cwd();
            if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
                console.log(chalk.green(`${path.resolve(cwd, 'frakas.json')} exists`));
            } else {
                console.log(chalk.yellow(`${path.resolve(cwd, 'frakas.json')} does not exist`));
            }

            var appConfig = getFrakasJson();

            console.log(chalk.blue("Watch Started"));
            
            await serve(appConfig, __dirname, argv);

        })
    .command("up", "serve game instance without build and watch using locally running backend server",
        (yargs) => yargs
            .positional("webpack-config", { alias: "c", describe: "Webpack config file name", type: 'string', default: 'webpack.config.js' })
            .positional("verbose", { alias: "v", describe: "verbose logging", type: 'boolean', default: false })
            .positional("dry-run", { alias: "d", describe: "dry run", type: 'boolean', default: false })
        ,
        async (argv) => {
            var cwd = process.cwd();
            if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
                console.log(chalk.green(`${path.resolve(cwd, 'frakas.json')} exists`));
            } else {
                console.log(chalk.yellow(`${path.resolve(cwd, 'frakas.json')} does not exist`));
            }

            var appConfig = getFrakasJson();
            await up(appConfig, __dirname, argv);

        })

    .command("build", "build source code",
        (yargs) => yargs
            .positional("webpack-config", { alias: "c", describe: "Webpack config file name", type: 'string', default: 'webpack.config.js' })
            .positional("verbose", { alias: "v", describe: "verbose logging", type: 'boolean', default: false })
            .positional("dry-run", { alias: "d", describe: "dry run", type: 'boolean', default: false }),
        async (argv) => {
            var cwd = process.cwd();
            if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
                console.log(chalk.green(`${path.resolve(cwd, 'frakas.json')} exists`));
            } else {
                console.log(chalk.yellow(`${path.resolve(cwd, 'frakas.json')} does not exist`));
            }

            buildWebpack(argv, () => {

            }, errors => {

                var errorsText = errors ? " with errors" : "";
                console.log(chalk.green(`[Overall build Complete${errorsText}]`));
                process.exit(0);
            });
        })
    .command("push", "Push local files to Frakas Platform (requires login)",
        (yargs) => yargs
            .positional("webpack-config", { alias: "c", describe: "Webpack config file name", type: 'string', default: 'webpack.config.js' })
            .positional("verbose", { alias: "v", describe: "verbose logging", type: 'boolean', default: false })
            .positional("dry-run", { alias: "d", describe: "dry run", type: 'boolean', default: false })
        , async (argv) => {
            var appConfig = await getFrakasJson();
            await push(appConfig, argv);
        })
    .command("list-games", "List all of my games on Frakas Platform (requires login)", () => { }, async (argv) => {
        await listGames();
    })
    .command("clear-token", "Clear token cache", () => { }, async (argv) => {
        await clearCache();
    })
    .argv;

// **

