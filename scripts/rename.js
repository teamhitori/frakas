var fs = require('fs');

let rawdata = fs.readFileSync('package.json');
let package = JSON.parse(rawdata);

package.name = "frakas"

var packageStr = JSON.stringify(package, null, 2);

fs.writeFileSync('package.json', packageStr);

