const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8');

console.log("Has ç:", content.includes('ç'));
console.log("Has ç as buffer:", fs.readFileSync('App.tsx').toString('binary').includes('ç'));
console.log("Has Ã§ as buffer:", fs.readFileSync('App.tsx').toString('binary').includes('Ã§'));

