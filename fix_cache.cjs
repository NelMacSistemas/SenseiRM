const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');

// Using regex to replace the fetch call exactly
appContent = appContent.replace(
  /const res = await fetch\('\/api\/data',\s*\{/g,
  "const res = await fetch(`/api/data?t=${Date.now()}`, {"
);

fs.writeFileSync(appPath, appContent, 'utf8');

const auditPath = path.join(__dirname, 'services', 'auditService.ts');
let auditContent = fs.readFileSync(auditPath, 'utf8');

auditContent = auditContent.replace(
  /const res = await fetch\('\/api\/data',\s*\{/g,
  "const res = await fetch(`/api/data?t=${Date.now()}`, {"
);

fs.writeFileSync(auditPath, auditContent, 'utf8');

console.log('Cache busters applied successfully!');
