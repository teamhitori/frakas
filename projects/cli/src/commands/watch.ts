import express from 'express';
import chalk from 'chalk';
import path from 'path'
import fs from 'fs';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import yargs from 'yargs';
import { v4 as uuidv4 } from 'uuid';

// mine
import { build } from '../utils/buildExt'
import { AppConfig } from '../documents/appConfig';
import { args } from '../documents/args';


export async function watchAll(appconfig: AppConfig, root: string, argv: args) {
    console.info(`build all`);

    var cwd = process.cwd();
    var entrypointPath = path.resolve(cwd, appconfig.entryPoint);

    console.log(`Entrypoint: ${entrypointPath}`);

    fs.rmSync("obj", { force: true, recursive: true });

    var webBuildInProgress = false;
    var nodeBuildInProgress = false

    var webBuildErrors = false;
    var nodeBuildErrors = false

    await build(appconfig, cwd, "web", argv, () =>{
        webBuildInProgress = true;
    }, errors => { 
        webBuildInProgress = false;
        webBuildErrors = errors;
        if(!nodeBuildInProgress){
            var errorsText = nodeBuildErrors || webBuildErrors ? " with errors" : "";
            console.log(chalk.green(`[Overall build Complete${errorsText}]`));
        }
    });

    await build(appconfig, cwd, "node", argv, () =>{
        nodeBuildInProgress = true;
    }, errors => { 
        nodeBuildInProgress = false;
        nodeBuildErrors = errors;
        if(!webBuildInProgress){
            var errorsText = nodeBuildErrors || webBuildErrors ? " with errors" : "";
            console.log(chalk.green(`[Overall build Complete${errorsText}]`));
        }
    });
}
