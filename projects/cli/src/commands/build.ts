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


export async function buildAll(appconfig: AppConfig, root: string, argv: yargs.ArgumentsCamelCase<{}>) {
    console.info(`build all`);

    var cwd = process.cwd();
    var entrypointPath = path.resolve(cwd, appconfig.entryPoint);

    console.log(`Entrypoint: ${entrypointPath}`);

    fs.rmSync("obj", { force: true, recursive: true });

    var webBuild = false;
    var nodeBuild = false

    var webBuildErrors = false;
    var nodeBuildErrors = false

    await build(appconfig, cwd, "web", argv, () =>{
        webBuild = true;
    }, errors => { 
        webBuild = false;
        webBuildErrors = errors;
        if(!nodeBuild){
            var errorsText = nodeBuildErrors || webBuildErrors ? " with errors" : "";
            console.log(chalk.green(`[Overall build Complete${errorsText}]`));
        }
    });

    await build(appconfig, cwd, "node", argv, () =>{
        nodeBuild = true;
    }, errors => { 
        nodeBuild = false;
        nodeBuildErrors = errors;
        if(!webBuild){
            var errorsText = nodeBuildErrors || webBuildErrors ? " with errors" : "";
            console.log(chalk.green(`[Overall build Complete${errorsText}]`));
        }
    });
}
