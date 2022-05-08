import chalk from 'chalk';
import path from 'path'
import fs from 'fs';
import { ChildProcessWithoutNullStreams } from 'child_process'

// mine
import { build } from '../utils/buildExt'
import { AppConfig } from '../documents/appConfig';
import { args } from '../documents/args';
import { startWeb } from '../utils/webExt';
import { spawnBackend } from '../utils/runExt';
import { buildAll } from './buildNew';


export async function serve(appconfig: AppConfig, root: string, argv: args) {
    console.info(`start server on :${argv.port}`);

    console.log(chalk.blue("Watch Started"));

    var cwd = process.cwd();
    var entrypointPath = path.resolve(cwd, appconfig.entryPoint);

    console.log(`Entrypoint: ${entrypointPath}`);

    fs.rmSync("obj", { force: true, recursive: true });

    // await build(appconfig, cwd, "web", argv, () => {

    // }, () => {
    //     console.log(chalk.blue(`listening on port http://localhost:${argv.port}`));
    // });

    // var currentBe: ChildProcessWithoutNullStreams | undefined = undefined;

    // await build(appconfig, cwd, "node", argv, () => {
    //     currentBe?.kill(9);
    // }, () => {
    //     currentBe = spawnBackend(appconfig, root, argv);
    // });

    await buildAll(appconfig, root, argv);

    spawnBackend(appconfig, root, argv);

    startWeb(appconfig, root, argv);
    
}
