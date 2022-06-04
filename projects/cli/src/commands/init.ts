// theirs
import chalk from 'chalk';
import fs from 'fs';
import { exec } from 'child_process'
import yargs from 'yargs';
import path from "path";

// mine
// import { AppConfig } from '../documents/appConfig';
import { fixGameName } from '../utils/ext';

export async function init(argv: yargs.ArgumentsCamelCase<{}>) {

    var cwd = process.cwd();

    var run = (command: string, headline: string) => {
        console.log(chalk.whiteBright(headline));
        return new Promise(resolve => {
            exec(command, { cwd: cwd }, async (error, stdout, stderr) => {
                if (error) {
                    if (argv.verbose) console.log(chalk.yellow(`${error.message}`));
                    //return;
                }
                if (stderr) {
                    if (argv.verbose) console.log(chalk.yellow(`${stderr}`));
                    //return;
                }

                if (argv.verbose) console.log(chalk.gray(`${stdout}`));

                resolve({});
            });
        });
    }

    var gameName = fixGameName(path.basename(path.resolve(process.cwd())));

    var config = {
        entryPoint: "./src/index.ts",
        fillScreen: true,
        gameName: gameName,
        screenRatio: "1",
        gameThumbnail: "",
        webPort: "8080",
        clientDir: "web",
        serverDir: "server",
        remoteHost: ""
    }

    await run("npm init -y", "Initializing npm..");
    await run("npm i typescript -g", "Installing Typescript..");
    await run("tsc --init", "Initializing Typescript..");
    await run("npm i @frakas/api", "Installing @frakas/api ..");
    await run("npm i babylonjs babylonjs-gui babylonjs-loaders", "Installing Bobaylonjs ..");
    await run("npm i webpack webpack-cli", "Installing Webpack ..");
    await run("npm i bufferutil cors file-loader copy-webpack-plugin html-webpack-plugin mini-css-extract-plugin node-gyp-build path-browserify source-map-loader ts-loader utf-8-validate", "Installing other Webpack Dependencies..");

    await fs.promises.writeFile('frakas.json', JSON.stringify(config, null, 2));
    await fs.promises.mkdir('src', { recursive: true });
    await fs.promises.writeFile('src/index.ts', code);
    await fs.promises.writeFile('.frignore', ignore);
    await fs.promises.writeFile('webpack.config.js', webpackConfig);

    // update package.json
    let rawdata = fs.readFileSync('package.json').toString();
    let packageJson = JSON.parse(rawdata);
    packageJson.scripts["build"] = "npx webpack";
    packageJson.scripts["run"] = "node server/node.bundle.main.js -o";
    var packageStr = JSON.stringify(packageJson, null, 2);
    fs.writeFileSync('package.json', packageStr)

    console.log(chalk.blue("Done!!"));
}

const ignore = `node_modules
bin
obj
build
web
client
server`;

const code = `
import { Engine, Scene, Vector3, HemisphericLight, ShadowGenerator, PointLight, MeshBuilder, StandardMaterial, ArcRotateCamera, Matrix, Color3 } from "babylonjs";
import { createFrontend, createBackend } from '@frakas/api/public';

// Think twice before creating global variables, frontend state cannot see backend, and vice versa.

// Create frontend and receive api for calling backend
createFrontend(api => {

    // My random player color
    var myColorRaw = Math.floor(Math.floor(Math.random() * 1000)); // 1s = R, 10s = G, 100s = B

    // map raw number into Bablylon Color3 vector
    var myColor = new Color3((myColorRaw % 10) / 10, ((myColorRaw / 10) % 10) / 10, ((myColorRaw / 100) % 10) / 10);

    // Default Grey Color
    var sphereDefaultColor = new Color3(0.7, 0.7, 0.7);

    // HTML Canvas used by Babylonjs to project game scene
    var canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

    // Load the 3D engine
    var engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new Scene(engine);

    // This creates an arcRotate camera
    var camera = new ArcRotateCamera("camera", BABYLON.Tools.ToRadians(128), BABYLON.Tools.ToRadians(40), 10, Vector3.Zero(), scene);

    // This targets the camera to scene origin
    camera.setTarget(Vector3.Zero());

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var lightH = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    lightH.intensity = 0.7;

    var light = new PointLight("point-light", new Vector3(3, 3, -3), scene);
    light.position = new Vector3(3, 10, 3);
    light.intensity = 0.5;

    // Babylonjs built-in 'sphere' shape. Params: name, options, scene
    var sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);
    var sphereMaterial = new StandardMaterial("sphereMaterial", scene);
    sphereMaterial.diffuseColor = sphereDefaultColor;
    sphere.material = sphereMaterial;

    // Move the sphere upward 1/2 its height
    sphere.position.y = 1;

    // Babylonjs built-in 'ground' shape. Params: name, options, scene
    var ground = MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);
    var groundMaterial = new StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseColor = myColor;
    ground.material = groundMaterial;
    ground.receiveShadows = true;

    // Create Shadows
    var shadowGenerator = new ShadowGenerator(1024, light);
    shadowGenerator.addShadowCaster(sphere);
    shadowGenerator.useExponentialShadowMap = true;

    // Babylonjs on pointerdown event
    scene.onPointerDown = function castRay() {
        var ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), camera);

        var hit = scene.pickWithRay(ray);

        if (hit?.pickedMesh && hit.pickedMesh.name == "sphere") {

            // send enable player color event to backend
            api.sendToBackend(<PlayerEvent>{
                enable: true,
                color: myColor
            });
        }
    }

    // Babylonjs on pointerup event
    scene.onPointerUp = function castRay() {

        // send disable player color event to backend
        api.sendToBackend(<PlayerEvent>{
            enable: false,
            color: myColor
        });
    }

    // Babylonjs render loop
    engine.runRenderLoop(() => {
        scene?.render();
    });

    // the canvas/window resize event handler
    window.addEventListener('resize', () => {
        engine.resize();
    });

    // Send Player enter event to backend, ust be called before sending other events to backend
    api.playerEnter();

    // receive public events from backend
    api.onPublicEvent<PlayerEvent>()
        .subscribe((event) => {

            // set sphere color
            sphereMaterial.diffuseColor = event.color;
        });
});


// Create backend and receive api for calling frontend
createBackend(api => {

    // default sphere color
    var sphereDefaultColor = new Color3(0.7, 0.7, 0.7);

    // keep track of entered players in array
    var playerColors: PlayerColor[] = []

    api.onPlayerEvent<PlayerEvent>()
        .subscribe((event) => {

            if(event.playerState.enable) {

                // Add player color to list, if not already added
                if(!playerColors.some(p => p.playerPosition == event.playerPosition)) {
                    playerColors.push({playerPosition: event.playerPosition, color: event.playerState.color});
                } 
            } else {

                // else remove player color, if exists in list
                playerColors = playerColors.filter(p => p.playerPosition != event.playerPosition);
            }

            // send most recent color to all players if exists, or else send default color
            if(playerColors.length) {
                var playerColor = playerColors[playerColors.length-1];

                api.sendToAll(<PlayerEvent>{
                    enable: true,
                    color: playerColor.color
                });
            } else {
                api.sendToAll(<PlayerEvent>{
                    enable: true,
                    color: sphereDefaultColor
                });
            }
        });
});

interface PlayerColor {
    playerPosition: number,
    color: Color3
}

interface PlayerEvent {
    enable: boolean,
    color: Color3
}`

var webpackConfig = `const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');
const path = require('path');
var cwd = process.cwd();
const configRaw = fs.readFileSync('frakas.json');
const config = JSON.parse(configRaw);

console.log("frakas.json: ", config)

var clientConfig = {
    target: 'web',
    devtool: 'inline-source-map',
    entry: {
        client: config.entryPoint
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
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
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            "express": false,
            "stream": false,
            "crypto": false,
            "https": false,
            "zlib": false,
            "net": false,
            "tls": false,
            "os": false,
            "fs": false,
            "ws": false,
            "child_process": false,
            "http2": false,
            "http": false,
            "buffer": false,
            "querystring": false,
            "string_decoder": false,
            "tty": false,
            "url": false,
            "util": false,
            "process": false
          },
          fallback: {
            "path": require.resolve("path-browserify")
          },
        
        modules: [
            /* assuming that one up is where your node_modules sit,
               relative to the currently executing script
            */
            path.join(__dirname, './node_modules')
          ]
    },
    output: {
        globalObject: 'self',
        filename: '[name].js',
        path: path.resolve(__dirname, config.clientDir)
    },
    plugins: [new HtmlWebpackPlugin({
        title: 'Custom template',
        // Load a custom template (lodash by default)
        templateContent: \`<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="X-UA-Compatible" content="ie=edge">
                    <title>\${config.gameName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                    #renderCanvas {
                        position: relative;
                        top: 0px;
                        bottom: 0px;
                        max-width: 100%;
                        margin: auto auto;
                        border: 1px solid white;
                        background-color: #383838;
                        height: 100%;
                      }
                      
                      .cavas-holder-inner {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        position: absolute;
                        background-color: #585858;
                      }
                      
                      body{
                        margin:0;
                        overflow:hidden;
                        overscroll-behavior-y: contain;
                      }
                    </style>
                </head>
                <body>
                  <div class="cavas-holder-inner" id="renderCanvas-holder">
                    <canvas tabindex="0" autofocus width="2000" id="renderCanvas"></canvas>
                  </div>
                </body>
                </html>\`
    }),
    new MiniCssExtractPlugin(),
    new CopyWebpackPlugin({
        patterns: [
            {
                from: 'assets',
                to:'assets',
                noErrorOnMissing: true
            },
            {
                from: 'frakas.json'
            }
        ]
    })
    ],
    
};

var serverConfig = {
    target: 'node',
    devtool: 'inline-source-map',
    entry: {
        server: config.entryPoint
    },
    module: {
        rules: [
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
            test: /\.ttf$/,
            use: ['file-loader']
        }
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        modules: [
            /* assuming that one up is where your node_modules sit,
               relative to the currently executing script
            */
            path.join(__dirname, './node_modules')
          ]
    },
    output: {
        globalObject: 'self',
        filename: '[name].js',
        path: path.resolve(__dirname, config.serverDir)
    },
    plugins: [new CopyWebpackPlugin({
        patterns: [
            {
                from: 'frakas.json'
            }
        ]
    })]
};

module.exports = [
    clientConfig,
    serverConfig
];`