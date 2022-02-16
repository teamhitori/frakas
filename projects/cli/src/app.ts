import express from 'express';
import chalk from 'chalk';
import * as figlet from 'figlet';
import * as yargs from 'yargs'
import path from 'path'
import fs from 'fs';

// mine
import { build, getConfig } from './utils/ext'

console.log(
    chalk.yellowBright(
        figlet.textSync('FRAKAS', { horizontalLayout: 'full' })
    )
);

let rawdata = fs.readFileSync(path.join(__dirname, 'version.json'));
let versionConfig = JSON.parse(rawdata.toString());

console.log(
    chalk.yellow(
        `v: ${versionConfig.version}`
    )
);


var runAsync = async () => {

    const options = await yargs
        .usage("Usage: frakas serve")
        .command("serve", "Serve game instance using locally running backend server", () => { }, async (argv) => {
            if (argv.verbose) console.info(`start server on :${argv.port}`);

            console.log(chalk.blue("Build Started"));

            var appConfig = await getConfig();
            var cwd = process.cwd();
            var entrypoint = path.resolve(cwd, appConfig?.entryPoint ?? "./src/index.ts");

            console.log(`Entrypoint: ${entrypoint}`)

            await build(cwd, "web", entrypoint);
        })
        .argv;


    if (false) {
        // -- Express
        const port: string | number = process.env.port || 2525;

        const app = express();

        app.listen(port);

        console.log(`listening on port ${port}`);

        app.use(express.static('public'));

        console.log(`serving public folder`);
    }


}

runAsync()




