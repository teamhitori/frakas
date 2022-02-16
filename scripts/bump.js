var fs = require('fs');

let rawdata = fs.readFileSync('package.json');
let package = JSON.parse(rawdata);

var split = package.version.split(".");
var last = parseInt(split[split.length -1 ]);

console.log(`Current version: ${package.version}`)

split[split.length -1 ] = `${last+1}`

var newVersion = split.join('.');

package.version = newVersion;

console.log(`New version: ${newVersion}`)

var packageStr = JSON.stringify(package, null, 2);

fs.writeFileSync('package.json', packageStr)



