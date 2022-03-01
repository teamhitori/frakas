var fs = require('fs');

var sourceRaw = fs.readFileSync('package.json');
var source = JSON.parse(sourceRaw);
var targetFile = process.argv[2]
var targetRaw = fs.readFileSync(targetFile);
var target = JSON.parse(targetRaw);

for (const name in source.dependencies) {
    if (Object.hasOwnProperty.call(source.dependencies, name)) {
        const element = source.dependencies[name];

        target.dependencies[name] = element;
    }
}

var targetStr = JSON.stringify(target, null, 2);

fs.writeFileSync(targetFile, targetStr)
