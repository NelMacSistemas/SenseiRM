const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');

// Replace the line precisely
appContent = appContent.replace(
  /console\.log\('SYNC OK', type\);/g,
  ""
);

fs.writeFileSync(appPath, appContent, 'utf8');
console.log('Removed faulty console.log');
