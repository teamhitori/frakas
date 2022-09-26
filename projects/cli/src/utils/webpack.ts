import webpack, { MultiStats, RuleSetRule, Stats, WebpackError } from 'webpack';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';


// mine
import { args } from '../documents/args';

export function buildWebpack(args: args, callbackStart: () => void, callbackComplete: (errors: boolean) => void) {

    var buildStart = Date.now();

    var cwd = process.cwd();
    var entrypointPath = path.resolve(cwd, args.webpackConfig); 

    console.log(`Entrypoint: ${entrypointPath}`);

    var config = require(entrypointPath)

    const compiler = webpack(config, (err, stats: any) => {

        var hasErrors = false;

        if (args.verbose && stats) console.log(stats)

        if (err) console.log(chalk.red(err));

        for (const stat of stats.stats) {

            if(stat.compilation.errors.length){
                hasErrors = true;

                console.log(chalk.red("Compilation Errors"));
                console.log(chalk.red(stat.compilation.errors));
            }

        }

        callbackComplete(hasErrors);
    });

    compiler.hooks.watchRun.tap('watchRun', (context) => {
        buildStart = Date.now();
        console.log(chalk.whiteBright(`[${new Date(buildStart).toLocaleString()}] Build started `));

        callbackStart()
    });

    if(args.dryRun) return;

    console.log(chalk.blue("Watch Started"));

    compiler.watch({
        poll: 300

    }, (err: Error | null | undefined, stats: Stats | undefined) => { // [Stats Object](#stats-object)

        if (args.verbose && stats) console.log(stats)

        if (stats?.compilation.errors.length) {
            console.log(chalk.yellow(stats?.compilation.errors));
            if (err) console.log(chalk.red(err))
            return
        }
    });
}