import webpack from 'webpack';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs'

// mine
import { AppConfig } from './documents/config'

export async function getConfig(): Promise<AppConfig | undefined> {
    try {
        let rawdata = fs.readFileSync('frakas.json');

        if(!rawdata) return;

        console.log("Found frakas.config, reading contents");

        let config = JSON.parse(rawdata.toString('utf-8')) as AppConfig
    
        return config;
    } catch(ex){

        console.log(chalk.red(`${ex}`));

    }

    return undefined  
}

export async function build(cwd: string, target: string, entry: string) {
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
        },
        output: {
            globalObject: 'self',
            filename: `[name].${target}.bundle.js`,
            path: path.resolve(cwd, 'obj')
        }
    });

    compiler.run((err: any, stats: any) => { // [Stats Object](#stats-object)
        // ...

        console.log(stats)

        if(err){
            console.log(chalk.red(err))
        }

        compiler.close((closeErr: any) => {
            // 
            console.log(chalk.blueBright("Build Complete") );

            if(closeErr){
                console.log(chalk.red(closeErr))
            }
        });
    });
}