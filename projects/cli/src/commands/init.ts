import chalk from 'chalk';
import fs from 'fs';
import { exec } from 'child_process'
import yargs from 'yargs';

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

    await run("npm init -y", "Initializing npm..");
    await run("npm i typescript -g", "Installing Typescript..");
    await run("tsc --init", "Initializing Typescript..");
    await run("npm i frakas", "Adding Frakas Dependencies..");
    await run("npm i @babylonjs/core", "Adding @babylonjs/core..");

    await fs.promises.writeFile('frakas.json', config);
    await fs.promises.mkdir('src', { recursive: true });
    await fs.promises.writeFile('src/index.ts', code);

    // update package.json
    let rawdata = fs.readFileSync('package.json').toString();
    let packageJson = JSON.parse(rawdata);
    packageJson.scripts["build"] = "frakas serve";
    var packageStr = JSON.stringify(packageJson, null, 2);
    fs.writeFileSync('package.json', packageStr)

    console.log(chalk.blue("Done!!"));
}

const config =
    `{
    "entryPoint": "src/index.ts",
    "ws-port": 10000,
    "port": 10001
}
`

const code =
    `
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Meshes/Builders/sphereBuilder";
import "@babylonjs/core/Meshes/Builders/boxBuilder";
import "@babylonjs/core/Meshes/Builders/groundBuilder";
import { setFrontend, setBackend } from 'frakas/api';

setFrontend(api => {
    var canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
           
    // Load the 3D engine
    var engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

     // This creates a basic Babylon Scene object (non-mesh)
     var scene = new Scene(engine);

     // This creates and positions a free camera (non-mesh)
     var camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);

     // This targets the camera to scene origin
     camera.setTarget(Vector3.Zero());

     // This attaches the camera to the canvas
     camera.attachControl(canvas, true);

     // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
     var light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);

     // Default intensity is 1. Let's dim the light a small amount
     light.intensity = 0.7;

     // Our built-in 'sphere' shape. Params: name, options, scene
     var sphere = Mesh.CreateSphere("sphere", 32, 2, scene);

     // Move the sphere upward 1/2 its height
     sphere.position.y = 1;

     // Our built-in 'ground' shape. Params: name, options, scene
     var ground = Mesh.CreateGround("ground", 6,  6, 2, scene);

    engine.runRenderLoop(() => {
        scene?.render();
    });

    // the canvas/window resize event handler
    window.addEventListener('resize', () => {
        engine.resize();
    });

    var index = 0;

    api.onPrivateEvent()
        .subscribe((content) => {
            console.log(\`onPrivateEvent \${index++}\`, content);
        });

    api.onGameStop()
        .subscribe((playerPosition) => {
            console.log(\`onGameStop \${index++}\`, playerPosition);
        });

    api.onPublicEvent()
        .subscribe((playerPosition) => {
            console.log(\`onPublicEvent \${index++}\`, playerPosition);
        });

    api.sendToBackend({ content: "hello from front end" })
});

setBackend(api => {

    var index = 0;

    console.log("user setBackend called", api);

    api.onGameStart()
        .subscribe((content) => {
            console.log(\`onGameStart \${index++}\`, content);
        });

    api.onGameStop()
        .subscribe((content) => {
            console.log(\`onGameStop \${index++}\`, content);
        });

    api.onPlayerEnter()
        .subscribe((content) => {
            console.log(\`onPlayerEnter \${index++}\`, content);
        });

    api.onPlayerEvent<any>()
        .subscribe((content) => {
            console.log(\`onPlayerEvent \${index++}\`, content.playerPosition, content.playerState);

            api.sendToAll({ content: "Hello everyone from backend" });

            api.sendToPlayer({ playerPosition: content.playerPosition, playerState: { content: \`Hello player-\${content.playerPosition}\` } });
        });

    api.onPlayerExit()
        .subscribe((content) => {
            console.log(\`onPlayerExit \${index++}\`, content);
        });
});

`