// import * as ts from "typescript";
// import path, { parse } from 'path';
// import fs from 'fs';
// import fse from 'fs-extra';
// import chalk from 'chalk';

// // mine
// //import { AppConfig } from "../documents/appConfig";
// import { args } from "../documents/args";


// function compile(fileNames: string[], options: ts.CompilerOptions): boolean {
//   let program = ts.createProgram(fileNames, options);
//   let emitResult = program.emit();

//   let allDiagnostics = ts
//     .getPreEmitDiagnostics(program)
//     .concat(emitResult.diagnostics);

//   allDiagnostics.forEach(diagnostic => {
//     if (diagnostic.file) {
//       let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
//       let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
//       console.log(chalk.red(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`));
//     } else {
//       console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
//     }
//   });

//   return !emitResult.emitSkipped;
// }

// export async function buildAll(appconfig: any, root: string, argv: args): Promise<boolean> {

//   fs.rmSync("obj", { force: true, recursive: true });

//   var cwd = process.cwd();
//   var entrypointPath = path.resolve(cwd, appconfig.entryPoint);
//   var entryName = parse(appconfig.entryPoint).name
//   var outputPath = path.resolve(cwd, "obj");

//   console.log(`compile root:${entrypointPath}`);

//   if (!fs.existsSync(entrypointPath)) {
//     console.log(`Cannot find ${entrypointPath}, extiing`);
//     return false;
//   }

//   var options = {
//     noEmitOnError: true,
//     noImplicitAny: true,
//     target: ts.ScriptTarget.ESNext,
//     module: ts.ModuleKind.CommonJS,
//     esModuleInterop: true,
//     skipLibCheck: true,
//     outDir: outputPath
//   }

//   var compiled = compile([entrypointPath], options);

//   if (!compiled) {
//     console.log(`Typescript compilation error, exiting`);
//     return false;
//   }

//   var browserifySource = path.resolve(`${outputPath}`, `${entryName}.js`);
//   var browserifyTarget = path.resolve(`${outputPath}`, `client.js`);

//   console.log(`Entry: ${browserifySource}, packing ..`);

//   var myFile = fs.createWriteStream(browserifyTarget);

//   // var b = browserify({
//   //   //node: true,
//   //   plugin: [
//   //     [require('esmify'), { /* ... options ... */ }]
//   //   ],
//   //   ignoreMissing: true
//   // });
//   // b.add(browserifySource);

//   return new Promise((resolve, reject) => {

//     var stream = b.bundle().pipe(myFile);
//     stream.on('finish', async function () {

//       console.log(chalk.white(`Bundle created: ${browserifyTarget}`))

//       var assetsTarget = path.resolve(outputPath, `assets`);
//       var assetsSource = path.resolve(cwd, `assets`);

//       if (fs.existsSync(assetsSource)) {
//         console.log(`Copying Static assets ${assetsSource} to ${assetsTarget}`);

//         fse.copySync(assetsSource, assetsTarget)
//       }


//       var html = getHtml(appconfig.gameName, `assets/`, argv.wsPort, appconfig.fillScreen, appconfig.screenRatio, argv.webBundleName, argv.remoteHttpBase);

//       fs.writeFileSync(path.resolve(`${outputPath}`, `app.css`), css);
//       fs.writeFileSync(path.resolve(`${outputPath}`, `index.html`), html);

//       console.log(chalk.green(`[Overall build Complete]`));
//       resolve(true);

//     });

//     stream.on('error', function (ex) {
//       console.log(`[Overall build Complete with errors] ${ex}`);

//       resolve(false);
//       //reject(ex);
//     });

//   });

// }

// var getHtml = (gameName: string, assetsRoot: string, wsPort: number, fillScreen: boolean, screenRatio: number, bundleName: string, remoteHttpBase: string) => `<!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <meta http-equiv="X-UA-Compatible" content="ie=edge">
//     <title>${gameName}</title>
//     </script><script defer="defer" src="${bundleName}.js"></script>
//     <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
//     <link href="app.css" rel="stylesheet">
// </head>
// <body>
//   <input type="hidden" value="${assetsRoot}" id="assets-root" />
//   <input type="hidden" value="ws://localhost:${wsPort}/ws" id="ws-url" />
//   <input type="hidden" value="${remoteHttpBase}" id="remote-http-base" />
//   <input type="hidden" value="${wsPort}" id="ws-port" />
//   <input type="hidden" value="${fillScreen}" id="fill-screen" />
//   <input type="hidden" value="${screenRatio}" id="screen-ratio" />
//   <div class="cavas-holder-inner" id="renderCanvas-holder">
//     <canvas tabindex="0" autofocus width="2000" id="renderCanvas"></canvas>
//   </div>
// </body>
// </html>`

// var css = `
// #renderCanvas {
//   position: relative;
//   top: 0px;
//   bottom: 0px;
//   max-width: 100%;
//   margin: auto auto;
//   border: 1px solid white;
//   background-color: #383838;
//   height: 100%;
// }

// .cavas-holder-inner {
//   width: 100%;
//   height: 100%;
//   display: flex;
//   position: absolute;
//   background-color: #585858;
// }

// body{
//   margin:0;
//   overflow:hidden;
//   overscroll-behavior-y: contain;
// }`;

