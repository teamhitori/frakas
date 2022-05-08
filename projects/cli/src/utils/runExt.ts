// theirs
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import chalk from 'chalk';
import path from 'path';

// mine
import { AppConfig } from "../documents/appConfig";
import { args } from "../documents/args";

export function spawnBackend(appconfig: AppConfig, root: string, argv: args): ChildProcessWithoutNullStreams {

    var cwd = process.cwd();
    var verboseTag = argv.verbose ? "-v" : "";

    console.log(chalk.green(`spawning backend, websocket on port ${argv.wsPort}`));

    var be = spawn("node", [path.resolve(argv.staticPath, "node.bundle.main.js"), `${argv.wsPort}`, verboseTag], { cwd: cwd });

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