// theirs
import chalk from 'chalk';
import path from 'path'
import fs from 'fs';

// mine
import { FrakasJson } from '@frakas/api/documents/FrakasJson';
import { args } from '../documents/args';
import { spawnBackend } from '../utils/runExt';

import { buildWebpack } from '../utils/webpack';
import { ChildProcessWithoutNullStreams } from 'child_process';


export async function serve(appconfig: FrakasJson, root: string, args: args) {
    console.info(`start server on :${appconfig.webPort}`);

    var currentBe: ChildProcessWithoutNullStreams | undefined = undefined;
    var isFirstRun = true;

    buildWebpack( args, () => {
        currentBe?.kill(9);
    }, errors => {

        if(errors) {
            console.log(chalk.yellow(`Build Complete with errors`));
            console.log(errors);

        } else {
            console.log(chalk.green(`Build Complete`));

            currentBe = spawnBackend(appconfig, root, args, isFirstRun);

            isFirstRun = false;
        }
    });
}
