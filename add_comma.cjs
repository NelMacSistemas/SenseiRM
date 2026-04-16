const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/Loader2\r?\n/, 'Loader2,\n');

fs.writeFileSync('App.tsx', code, 'utf8');
console.log('Comma added!');
