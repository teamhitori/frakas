// // theirs
// import express from "express";
// import path from 'path'
// import chalk from "chalk";
// import open from 'open';

// // mine
// // import { AppConfig } from "../documents/appConfig";
// import { args } from "../documents/args";


// export async function startWeb(appconfig: any, root: string, argv: args) {
//     const app = express();
//     app.listen(argv.port);

//     app.use(express.static('public'));

//     app.get('/favicon.ico', function (req, res) {
//         res.sendFile(path.resolve(root, 'favicon.ico'));
//     });

//     console.log(`argv.staticPath: ${argv.staticPath}`);

//     app.use(express.static(argv.staticPath));

//     console.log(chalk.blue(`Serving page on http://localhost:${argv.port}`));

//     await open(`http://localhost:${argv.port}`);
// }

