var copyDir = require('./copy-dir');

var src = process.argv[2];
var dest = process.argv[3];

console.log(`Copy source:${src} to dest:${dest}`);

copyDir(src, dest)