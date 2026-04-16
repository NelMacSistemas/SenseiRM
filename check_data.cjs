const fs = require('fs');
const content = fs.readFileSync('data.json', 'binary');
console.log("Has double-encoding â:", content.includes('Ã'));
console.log("data.json starts with:", content.substring(0, 100));
