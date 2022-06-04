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
        () => { }
        , async (argv) => {
            await init(argv);
        })
    .command("login", "Log onto Frakas platform", () => { }, async (argv) => {
        await login();
    })
    .command("serve", "Build and serve game instance using locally running backend server",
        (yargs) => yargs
        .positional("webpack-config", { alias: "c", describe: "Webpack config file name", type: 'string', default: 'webpack.config.js' })
        .positional("verbose", { alias: "v", describe: "verbose logging", type: 'boolean', default: false })
        ,
        async (argv) => {
            // var cwd = process.cwd();
            // if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
            //     console.log(chalk.green(`${path.resolve(cwd, 'frakas.json')} exists`));
            // } else {
            //     console.log(chalk.yellow(`${path.resolve(cwd, 'frakas.json')} does not exist`));
            // }
            var appConfig = getFrakasJson();
            await serve(appConfig, __dirname, argv);

        })
    // .command("up", "start game instance using locally running backend server",
    //     (yargs) => yargs
    //     // .positional("port", { alias: "p", describe: "Port Number when running Frakas locally", type: 'number', default: 10001 })
    //     // .positional("ws-port", { alias: "w", describe: "Websocket port number when running Frakas locally", type: 'number', default: 10000 })
    //     // .positional("static-path", { alias: "s", describe: "static path to start webserver", type: 'string', default: "obj" })
    //     // .positional("remote-http-base", { alias: "r", describe: "url to use when connecting to remotely running backend over http", type: 'string', default: "" })
    //     // .positional("web-bundle-name", { alias: "wb", describe: "The name of the javascript output file that is created by the build", type: 'string', default: 'web.bundle.main' })
    //     // .positional("node-bundle-name", { alias: "nb", describe: "The name of the javascript output file that is created by the build", type: 'string', default: 'node.bundle.main' })
    //     ,
    //     async (argv) => {
    //         // var cwd = process.cwd();
    //         // if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
    //         //     console.log(chalk.green(`${path.resolve(cwd, 'frakas.json')} exists`));
    //         // } else {
    //         //     console.log(chalk.yellow(`${path.resolve(cwd, 'frakas.json')} does not exist`));
    //         // }
    //         // var appConfig = await getConfig();
    //         // await up(appConfig, __dirname, argv);
    //     })
    .command("build", "build source code",
        (yargs) => yargs
        .positional("webpack-config", { alias: "c", describe: "Webpack config file name", type: 'string', default: 'webpack.config.js' })
        .positional("verbose", { alias: "v", describe: "verbose logging", type: 'boolean', default: false }),
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
    // .command("build2", "build source code2",
    //     (yargs) => yargs
    //         .positional("no-static", { alias: "x", describe: "Use to exclude static assets folder from build", type: 'boolean', default: true }),
    //     async (argv) => {
    //         var cwd = process.cwd();
    //         if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
    //             console.log(chalk.green(`${path.resolve(cwd, 'frakas.json')} exists`));
    //         } else {
    //             console.log(chalk.yellow(`${path.resolve(cwd, 'frakas.json')} does not exist`));
    //         }
    //         var appConfig = await getConfig();
    //         await buildAll2(appConfig, __dirname, argv);
    //     })
    // .command("watch", "build source code", () => { }, async (argv) => {

    //     var cwd = process.cwd();
    //     if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
    //         console.log(chalk.green(`${path.resolve(cwd, 'frakas.json')} exists`));
    //     } else {
    //         console.log(chalk.yellow(`${path.resolve(cwd, 'frakas.json')} does not exist`));
    //     }
    //     var appConfig = await getConfig();
    //     await watchAll(appConfig, __dirname, argv);
    // })
    .command("push", "Push local files to Frakas Platform (requires login)", () => { }, async (argv) => {

        var appConfig = await getFrakasJson();
        await push(appConfig);
    })
    .command("list-games", "List all of my games on Frakas Platform (requires login)", () => { }, async (argv) => {
        await listGames();
    })
    .command("clear-token", "Clear token cache", () => { }, async (argv) => {
        await clearCache();
    })
    .argv;

// **

