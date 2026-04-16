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

// We use regex to match Loader2 followed by newline then "}"
code = code.replace(/Loader2\r?\n\} from 'lucide-react';/, `Loader2,\n${newImports}\n} from 'lucide-react';`);


// 3. Update LoginPage
const loginPageRegex = /const LoginPage = \(\) => \{\s*const \{ login, currentUser, systemSettings \} = useApp\(\);\s*const \[error, setError\] = useState\(''\);\s*if \(currentUser\) return <Navigate to="\/dashboard" \/>;/;

const loginPageReplacement = `const LoginPage = () => {
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

code = code.replace(loginPageRegex, loginPageReplacement);

code = code.replace(/{systemSettings.appLogo \?/g, `{(appLogo || systemSettings.appLogo) ?`);
code = code.replace(/src=\{systemSettings.appLogo}/g, `src={appLogo || systemSettings.appLogo}`);
code = code.replace(/systemSettings.companyName/g, `(appName || systemSettings.companyName)`);

fs.writeFileSync('App.tsx', code, 'utf8');
console.log('final_safe_rebuild complete.');
