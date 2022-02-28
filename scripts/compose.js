var fs = require('fs');

var copyDir = require('./copy-dir');
var outDir = './build';
var projects = [
    './projects/api/build',
    './projects/cli/build',
    './projects/publish_config'
];


var outExists = fs.existsSync(outDir);

if(outExists){
    console.log(`publish output folder exists, deleting`);
    fs.rmSync(outDir, {force:true, recursive: true})
}

console.log(`Starting Copy..`);

for (let project of projects) {
    console.log(`Copying ${project} to ${outDir}`);
    copyDir(`${project}`, outDir)
}




