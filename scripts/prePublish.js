var fs = require('fs');

let rawdata = fs.readFileSync('package.json');
let package = JSON.parse(rawdata);

var split = package.version.split(".");
var last = parseInt(split[split.length -1 ]);

console.log(`Current version: ${package.version}`);

split[split.length -1 ] = `${last+1}`;

var newVersion = split.join('.');

package.version = newVersion;

console.log(`New version: ${newVersion}`);

var packageStr = JSON.stringify(package, null, 2);

fs.writeFileSync('package.json', packageStr);

publishPackage = {};
publishPackage["name"] = package["name"];
publishPackage["version"] = package["version"];
publishPackage["description"] = package["description"];
publishPackage["files"] = package["files"];
publishPackage["repository"] = package["repository"];
publishPackage["keywords"] = package["keywords"];
publishPackage["author"] = package["author"];
publishPackage["license"] = package["license"];
publishPackage["bugs"] = package["bugs"];
publishPackage["homepage"] = package["homepage"];
publishPackage["dependencies"] = package["dependencies"];

if(package["main"]) {
    publishPackage["main"] = package["main"];   
}

if(package["bin"]) {
    publishPackage["bin"] = package["bin"];   
}

var publishPackageStr = JSON.stringify(publishPackage, null, 2);

fs.writeFileSync('publish/package.json', publishPackageStr);

fs.copyFileSync("README.md", "publish/README.md");
fs.copyFileSync("README.md", "publish/README.md");
fs.copyFileSync("LICENSE", "publish/LICENSE");




