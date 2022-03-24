var fs = require('fs');

let rawdata = fs.readFileSync('C:\\Users\\reube\\AppData\\Roaming\\Microsoft\\UserSecrets\\a0b120ef-ee80-4c73-833a-b57d0b135bb4\\secrets.json');
let package = JSON.parse(rawdata);

console.log(package);


