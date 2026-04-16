const fs = require('fs');

let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Fix Mojibakes
const mapping = {
  'â†’': '→',
  'â€¢': '•',
  'â€"': '—',
  'AtenÃ§Ã£o': 'Atenção',
  'UsuÃ¡rio': 'Usuário'
};

for (const [bad, good] of Object.entries(mapping)) {
  code = code.split(bad).join(good);
}

// 2. Add imports
const newImports = `  Wallet, Paperclip, History, UserCog, Eye, Cpu, FolderOpen, Key, ArrowLeft, ArrowRight, Camera, Copy, Save, Code, AlertTriangle as ExclamationTriangle, X as Times, Edit as EditAlt, Mail as Envelope, FileText as FileAlt`;

code = code.replace(/Loader2\r?\n\} from 'lucide-react';/, `Loader2,\n${newImports}\n} from 'lucide-react';`);

// 3. Fix LoginPage safely
let parts = code.split('const LoginPage = () => {');
if (parts.length === 2) {
  let beforeLogin = parts[0];
  let loginBody = 'const LoginPage = () => {' + parts[1];
  
  // Apply only inside LoginPage
  loginBody = loginBody.replace(/{systemSettings.appLogo \?/g, `{(appLogo || systemSettings.appLogo) ?`);
  loginBody = loginBody.replace(/src=\{systemSettings.appLogo}/g, `src={appLogo || systemSettings.appLogo}`);
  loginBody = loginBody.replace(/systemSettings.companyName/g, `(appName || systemSettings.companyName)`);

  const loginPageRegex = /const LoginPage = \(\) => \{\s*const \{ login, currentUser, systemSettings \} = useApp\(\);\s*const \[error, setError\] = useState\(''\);\s*if \(currentUser\) return <Navigate to="\/dashboard" \/>;/;

  const newLoginPageHook = `const LoginPage = () => {
  const { login, currentUser, systemSettings } = useApp();
  const [error, setError] = useState('');
  const [appLogo, setAppLogo] = React.useState('');
  const [appName, setAppName] = React.useState('SENSEIRM');

  React.useEffect(() => {
    fetch('/api/public-settings')
      .then(r => r.json())
      .then(d => {
        if (d.appLogo) setAppLogo(d.appLogo);
        if (d.companyName) setAppName(d.companyName);
      })
      .catch(e => console.error(e));
  }, []);

  if (currentUser) return <Navigate to="/dashboard" />;`;

  loginBody = loginBody.replace(loginPageRegex, newLoginPageHook);

  code = beforeLogin + loginBody;
  fs.writeFileSync('App.tsx', code, 'utf8');
  console.log('fix_logon complete without polluting AppProvider.');
} else {
  console.log('LoginPage not found properly.');
}
