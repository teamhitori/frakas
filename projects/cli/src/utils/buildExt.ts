import webpack, { RuleSetRule, Stats, WebpackError } from 'webpack';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs'
import yargs from 'yargs';


// mine
// import { AppConfig } from '../../../api/src/documents/config'
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from "mini-css-extract-plugin"
import { AppConfig } from '../documents/appConfig';

export async function getConfig(argv: yargs.ArgumentsCamelCase<{}>): Promise<AppConfig> {
    var res: { [id: string]: any; } =
    {
        "gameName": path.basename(path.resolve(process.cwd())),
        "ws-port": 2279,
        "port": 2280,
        "entryPoint": "./src/index.ts",
    }

    try {

        var cwd = process.cwd();

        if (fs.existsSync(path.resolve(cwd, 'frakas.json'))) {
            let rawdata = fs.readFileSync(path.resolve(cwd, 'frakas.json'));

            if (!rawdata) return <AppConfig>res;

            console.log("Found frakas.config, reading contents");

            let config = JSON.parse(rawdata.toString('utf-8'))

            for (const key in config) {
                if (Object.prototype.hasOwnProperty.call(config, key)) {
                    const element = config[key];
                    res[key] = element;
                }
            }

        }

    } catch (ex) {
        console.log(chalk.red(`${ex}`));
    }

    // override commandline
    if (argv.gameName) res.gameName = argv.gameName as string;
    if (argv.port) res.port = argv.port as number;
    if (argv["ws-port"]) res['ws-port'] = argv["ws-port"] as number;
    if (argv.entryPoint) res.entryPoint = argv.entryPoint as string;
    if (argv.verbose) res.verbose = argv.verbose as boolean;

    return <AppConfig>res;
}

export function build(cwd: string, target: string, entry: string, appConfig: AppConfig, callbackStart: () => void, callbackComplete: () => void) {

    var unresolved = true;

    var plugins = (target == "web") ? [new HtmlWebpackPlugin({
        title: 'Custom template',
        // Load a custom template (lodash by default)
        templateContent: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="ie=edge">
            <title>${appConfig.gameName}</title>
        </head>
        <body>
          <input type="hidden" value="ws://localhost:${appConfig['ws-port']}/ws" id="ws-url" />
          <input type="hidden" value="${appConfig['ws-port']}" id="ws-port" />
          <div class="cavas-holder-inner" id="renderCanvas-holder">
            <canvas tabindex="0" autofocus width="2000" id="renderCanvas"></canvas>
          </div>
        </body>
        </html>`
    }),
    new MiniCssExtractPlugin()] : [new MiniCssExtractPlugin()];

    var rules: (RuleSetRule | "...")[] = [
        {
            test: /\.(ts|tsx)$/,
            use: [
                {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true,
                    },
                }
            ],
            exclude: /node_modules/
        },
        {
            test: /\.js$/,
            enforce: "pre",
            use: ["source-map-loader"],
            exclude: /node_modules/
        },
        {
            test: /\.css$/,
            use: [
                MiniCssExtractPlugin.loader, // instead of style-loader
                'css-loader'
            ]
        },
        {
            test: /\.ttf$/,
            use: ['file-loader']
        }
    ];

    console.log(`target: ${target}, entry: ${entry}`);

    var buildStart = Date.now();
    
    const compiler = webpack({
        target: target,
        entry: [entry],
        watch: true,
        module: {
            rules: rules
        },
        resolve: {
            extensions: ['.ts', '.js'],
            fallback: {
                "fs": false,
                "tls": false,
                "net": false,
                "path": false,
                "zlib": false,
                "http": false,
                "http2": false,
                "https": false,
                "stream": false,
                "crypto": false,
                "util": false,
                "url": false,
                "assert": false,
                "os": false
            }
        },
        output: {
            globalObject: 'self',
            filename: `${target}.bundle.[name].js`,
            path: path.resolve(cwd, 'obj')
        },
        devtool: 'inline-source-map',
        optimization: {
            splitChunks: {
                chunks: 'all',
            }
        },
        plugins: plugins
    }, (err, stats) => {

        if (appConfig.verbose && stats) console.log(stats)

        if (stats?.compilation.errors.length) {
            console.log(chalk.yellow(`${target} build complete with errors in ${new Date(stats?.endTime - buildStart).getSeconds()} seconds [${new Date(stats?.endTime).toLocaleString()}] `));
            console.log(stats?.compilation.errors);
        } else{
            console.log(chalk.yellow(`${target} build complete with no errors in ${new Date(stats?.endTime - buildStart).getSeconds()} seconds ${target}.bundle.main.js [${new Date(stats?.endTime).toLocaleString()}] `));
        }

        if (unresolved) {
            unresolved = false;
        }

        callbackComplete();
    });

    compiler.hooks.watchRun.tap('watchRun', (context) => {
        buildStart = Date.now();
        console.log(chalk.whiteBright(`Build started: ${target} [${new Date(buildStart).toLocaleString()}]`));
        
        callbackStart()
    });

    compiler.watch({
        poll: 300

    }, (err: Error | null | undefined, stats: Stats | undefined) => { // [Stats Object](#stats-object)

        if (appConfig.verbose && stats) console.log(stats)

        if (stats?.compilation.errors.length) {
            console.log(chalk.yellow(stats?.compilation.errors));
            if (err) console.log(chalk.red(err))
            return
        }
    });
}