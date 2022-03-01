import webpack, { Stats, WebpackError } from 'webpack';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs'
import yargs from 'yargs';


// mine
import { AppConfig } from './documents/config'

export async function getConfig(argv: yargs.ArgumentsCamelCase<{}>): Promise<AppConfig> {
    var res: { [id: string]: any; } =
        {
            "ws-port": 2279,
            "port": 2280,
            "entryPoint": "./src/index.ts",
        }

    try {

        var cwd = process.cwd();

        if(fs.existsSync(path.resolve(cwd, 'frakas.json'))){
            let rawdata = fs.readFileSync(path.resolve(cwd, 'frakas.json'));

            if(!rawdata) return <AppConfig> res;

            console.log("Found frakas.config, reading contents");
    
            let config = JSON.parse(rawdata.toString('utf-8'))

            for (const key in config) {
                if (Object.prototype.hasOwnProperty.call(config, key)) {
                    const element = config[key];
                    res[key] = element;
                }
            }

        }
        
    } catch(ex){
        console.log(chalk.red(`${ex}`));
    }

    // override commandline
    if(argv.port) res.port = argv.port as number;
    if(argv["ws-port"]) res['ws-port'] = argv["ws-port"] as number;
    if(argv.entryPoint) res.entryPoint = argv.entryPoint as string;
    if(argv.verbose) res.verbose = argv.verbose as boolean;

    return <AppConfig> res;
}

export async function build(cwd: string, target: string, entry: string, verbose: any) {

    await new Promise((resolve, reject) => {
        console.log(`target: ${target}, entry: ${entry}`)
        const compiler = webpack({
            target: target,
            entry: [entry],
            module: {
                rules: [
                    {
                        test: /\.(ts|tsx)$/,
                        use: 'ts-loader',
                        exclude: /node_modules/
                    },
                    {
                        test: /\.js$/,
                        enforce: "pre",
                        use: ["source-map-loader"],
                      },
                    {
                        test: /\.css$/,
                        use: ['style-loader', 'css-loader']
                    },
                    {
                        test: /\.ttf$/,
                        use: ['file-loader']
                    }
                ],
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
                    "assert": false
                  } 
            },
            output: {
                globalObject: 'self',
                filename: `${target}.bundle.js`,
                path: path.resolve(cwd, 'obj')
            }
        });
    
        compiler.run((err: Error | null | undefined, stats: Stats | undefined) => { // [Stats Object](#stats-object)

            // ...
            if (verbose) console.log(stats)
    
            if(stats?.compilation.errors.length){
                console.log(chalk.yellow(stats?.compilation.errors));
                if (err) console.log(chalk.red(err))
                reject(err);
                return
            }
    
            compiler.close((closeErr: any) => {
                // 
                console.log(chalk.blueBright(`Build Complete: ${target}.bundle.js`) );
    
                if(closeErr || stats?.compilation.errors.length){
                    console.log(chalk.yellowBright(stats?.compilation.errors));
                    if(closeErr) console.log(chalk.red(closeErr));
                    reject(closeErr);
                    return
                }
                resolve({});
            });
        });

    });
   
}