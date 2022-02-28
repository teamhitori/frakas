var fs = require('fs');

let rawdata = fs.readFileSync('package.json');
let package = JSON.parse(rawdata);
let target = process.argv[2]

console.log(`writing version:${package.version} to ${target}`)

var packageStr = JSON.stringify({
    version: package.version
}, null, 2);

fs.writeFileSync(target, packageStr)



