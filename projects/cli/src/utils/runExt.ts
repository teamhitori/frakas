// theirs
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import chalk from 'chalk';
import path from 'path';

// mine
// import { AppConfig } from "../documents/appConfig";
import { args } from "../documents/args";
import { FrakasJson } from "@frakas/api/documents/FrakasJson";

export function spawnBackend(appconfig: FrakasJson, root: string, args: args, openBrowser: boolean): ChildProcessWithoutNullStreams | undefined {

    var cwd = process.cwd();
    var serveDir = path.join(cwd, appconfig.serverDir);
    //var verboseTag = args.verbose ? "-v" : "";
    var indexjs = path.resolve(serveDir, `server.js`);

    console.log(chalk.green(`spawning backend ${indexjs}`));

    if(args.dryRun) return;

    var be = spawn("node", [indexjs], { cwd: serveDir });
    
    be.stdout.on("data", (data: any) => {
        console.log(chalk.gray(data));
    });

    be.stderr.on("data", data => {
        console.log(chalk.gray(data));
    });

    be.on('error', (error) => {
        console.log(chalk.red(error));
    });

    be.on("close", async code => {
        console.log(chalk.blue("Backend has stopped"));
    });

    return be;
}