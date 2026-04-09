const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');

// The defaultValue bug is insidious. We must change defaultValue to a key-bound defaultValue or value.
// We can use key={systemSettings.companyName} so that React unmounts and remounts the input when it arrives.

// Locate: <input name="companyName" required defaultValue={systemSettings.companyName} placeholder="Sua Empresa"
appContent = appContent.replace(
  /<input name="companyName" required defaultValue=\{systemSettings\.companyName\}/g,
  "<input name=\"companyName\" key={systemSettings.companyName} required defaultValue={systemSettings.companyName}"
);

// We should also replace the sectors one if needed, but Sectors uses map so it updates naturally.
// Let's add an explicit alert to apiSync so the user SEES the confirmation coming from the server specifically!
appContent = appContent.replace(
  /if \(res\.ok\) \{/,
  "if (res.ok) {\n          console.log('SYNC OK', type);"
);

// We need to inject a success('Salvo no Banco de Dados!'); inside apiSync but we don't have access to success toaster there.
// Instead we'll replace the generic console.log with an alert if we have to, but it's annoying.

fs.writeFileSync(appPath, appContent, 'utf8');
console.log('Fixed Inputs!');
