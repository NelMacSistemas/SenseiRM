const fs = require('fs');

let code = fs.readFileSync('App.tsx', 'utf8');

// The string that needs to be reverted where appLogo is not defined
code = code.replace(/\(appLogo \|\| systemSettings\.appLogo\)/g, 'systemSettings.appLogo');
code = code.replace(/appLogo \|\| systemSettings\.appLogo/g, 'systemSettings.appLogo');

code = code.replace(/\(appName \|\| systemSettings\.companyName\)/g, 'systemSettings.companyName');
code = code.replace(/appName \|\| systemSettings\.companyName/g, 'systemSettings.companyName');

// Now, ensure LoginPage correctly has it.
let parts = code.split('const LoginPage = () => {');
if (parts.length === 2) {
  let beforeLogin = parts[0];
  let loginBody = 'const LoginPage = () => {' + parts[1];
  
  // Apply only inside LoginPage to the img and p tags
  loginBody = loginBody.replace(
    /\{systemSettings\.appLogo \?\(/g,
    `{(appLogo || systemSettings.appLogo) ?(`
  );
  loginBody = loginBody.replace(
    /src=\{systemSettings\.appLogo\}/g,
    `src={appLogo || systemSettings.appLogo}`
  );
  loginBody = loginBody.replace(
    /<p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 sm:mb-12 uppercase tracking-widest">\{systemSettings\.companyName\}<\/p>/g,
    `<p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 sm:mb-12 uppercase tracking-widest">{(appName || systemSettings.companyName)}</p>`
  );

  code = beforeLogin + loginBody;
  fs.writeFileSync('App.tsx', code, 'utf8');
  console.log('App.tsx has been cleansed of global appLogo/appName leaks.');
} else {
  console.log('Could not find LoginPage.');
}
