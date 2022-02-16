var fs = require('fs');

let rawdata = fs.readFileSync('package.json');
let package = JSON.parse(rawdata);

var packageStr = JSON.stringify({
    version: package.version
}, null, 2);

fs.writeFileSync('./build/version.json', packageStr)



