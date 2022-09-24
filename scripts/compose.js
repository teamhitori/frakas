var fs = require('fs');

var copyDir = require('./copy-dir');
var outDir = './publish';
var projects = [
    './projects/cli/publish',
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




