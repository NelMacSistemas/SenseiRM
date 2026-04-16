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
const importsLine = `Wallet, Paperclip, History, UserCog, Eye, Cpu, FolderOpen, Key, ArrowLeft, ArrowRight, Camera, Copy, Save, Code, AlertTriangle as ExclamationTriangle, X, Edit as EditAlt, Mail as Envelope, FileText as FileAlt`;
code = code.replace(/Wallet, Paperclip, History, UserCog[^}]*/, importsLine + '\n');


// 3. Add to iconMap
const newIcons = `
  'eye': Eye,
  'cpu': Cpu,
  'folder-open': FolderOpen,
  'exclamation-triangle': ExclamationTriangle,
  'key': Key,
  'times': X,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'edit-alt': EditAlt,
  'camera': Camera,
  'copy': Copy,
  'save': Save,
  'calendar-alt': Calendar,
  'envelope': Envelope,
  'loader': Loader2,
  'file-text': FileAlt,
  'code': Code,

  // All other previously found missing icons in the first batch
  'id-card': UserIcon,
  'map-marker-alt': MapPin,
  'wallet': Wallet,
  'paperclip': Paperclip,
  'history': History,
  'users-cog': Users,
  'user-tie': Briefcase,
  'shield-check': ShieldCheck,
`;
code = code.replace(/('spinner': Loader2,)/, `$1\n${newIcons}`);


// 4. Update LoginPage missing settings feature
const loginPageStart = `const LoginPage = () => {
  const { login, currentUser, systemSettings } = useApp();
  const [error, setError] = useState('');
  if (currentUser) return <Navigate to="/dashboard" />;`;

const loginPageReplacement = `const LoginPage = () => {
  const { login, currentUser, systemSettings } = useApp();
  const [error, setError] = useState('');
  const [appLogo, setAppLogo] = useState('');
  const [appName, setAppName] = useState('SENSEIRM');

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

code = code.replace(loginPageStart, loginPageReplacement);

// 5. Update logo rendering in LoginPage
code = code.replace(/{systemSettings.appLogo \?/g, `{(appLogo || systemSettings.appLogo) ?`);
code = code.replace(/src=\{systemSettings.appLogo}/g, `src={appLogo || systemSettings.appLogo}`);
code = code.replace(/systemSettings.companyName/g, `(appName || systemSettings.companyName)`);

fs.writeFileSync('App.tsx', code, 'utf8');
console.log('App.tsx strictly rebuilt.');
