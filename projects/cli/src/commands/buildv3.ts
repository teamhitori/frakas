import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

// mine
import { buildWebpack } from '../utils/webpack';
import { args } from '../documents/args';


export async function build(args: args) {
    console.info(`build`);

    // fs.rmSync("obj", { force: true, recursive: true });


    buildWebpack(args, () => {

    }, errors => {

        var errorsText = errors ? " with errors" : "";
        console.log(chalk.green(`[Overall build Complete${errorsText}]`));
        process.exit(0);
    });
}
