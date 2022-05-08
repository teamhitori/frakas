import webpack, { RuleSetRule, Stats, WebpackError } from 'webpack';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';


// mine
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { AppConfig } from '../documents/appConfig';
import { args } from '../documents/args';

export function build(config: AppConfig, cwd: string, target: string, argv: args, callbackStart: () => void, callbackComplete: (errors: boolean) => void) {

    var unresolved = true;
    var assets = ""

    var plugins: any[] = (target == "web") ? [new HtmlWebpackPlugin({
        title: 'Custom template',
        // Load a custom template (lodash by default)
        templateContent: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="ie=edge">
            <title>${config.gameName}</title>
        </head>
        <body>
          <input type="hidden" value="${assets}" id="assets-root" />
          <input type="hidden" value="ws://localhost:${argv.wsPort}/ws" id="ws-url" />
          <input type="hidden" value="${argv.wsPort}" id="ws-port" />
          <input type="hidden" value="${config.fillScreen}" id="fill-screen" />
          <input type="hidden" value="${config.screenRatio}" id="screen-ratio" />
          <div class="cavas-holder-inner" id="renderCanvas-holder">
            <canvas tabindex="0" autofocus width="2000" id="renderCanvas"></canvas>
          </div>
        </body>
        </html>`
    }),
    new MiniCssExtractPlugin()] : [new MiniCssExtractPlugin()];

    if(target == "web" && fs.existsSync(`${cwd}/assets`)) {
        plugins.push(
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'assets',
                        filter: async (resourcePath) => {
                            // var folderExists1 = fs.existsSync(`${cwd}/assets`);
                            // var folderExists2 = fs.existsSync(`${resourcePath}`);
                            // console.log(`${cwd}/assets exists: ${folderExists1}`);
                            // console.log(`${resourcePath} exists: ${folderExists2}`);
        
                            return fs.existsSync(`${cwd}/assets`);
                        }
                    }
                ]
            })
        )
    }

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

    console.log(`target: ${target}, entry: ${config.entryPoint}`);

    var buildStart = Date.now();

    const compiler = webpack({
        target: target,
        entry: [config.entryPoint],
        watch: true,
        watchOptions: {
            ignored: [path.resolve(cwd, 'obj')],
          },
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

        if (argv.verbose && stats) console.log(stats)

        if (stats?.compilation.errors.length) {
            console.log(chalk.yellow(`[${new Date(stats?.endTime).toLocaleString()}] Build complete: ${target} with errors in ${new Date(stats?.endTime - buildStart).getSeconds()} seconds`));
            console.log(stats?.compilation.errors);

            callbackComplete(true);
        } else {
            console.log(chalk.yellow(`[${new Date(stats?.endTime).toLocaleString()}] Build complete: ${target} with no errors in ${new Date(stats?.endTime - buildStart).getSeconds()} seconds output obj/${target}.bundle.main.js [${new Date(stats?.endTime).toLocaleString()}] `));

            callbackComplete(false);
        }

        if (unresolved) {
            unresolved = false;
        }


    });

    compiler.hooks.watchRun.tap('watchRun', (context) => {
        buildStart = Date.now();
        console.log(chalk.whiteBright(`[${new Date(buildStart).toLocaleString()}] Build started: ${target} `));

        callbackStart()
    });

    compiler.watch({
        poll: 300

    }, (err: Error | null | undefined, stats: Stats | undefined) => { // [Stats Object](#stats-object)

        if (argv.verbose && stats) console.log(stats)

        if (stats?.compilation.errors.length) {
            console.log(chalk.yellow(stats?.compilation.errors));
            if (err) console.log(chalk.red(err))
            return
        }
    });
}