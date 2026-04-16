const fs = require('fs');

let lines = fs.readFileSync('App.tsx', 'utf8').split('\n');

// 1. Fix Mojibakes natively on the lines array
const mapping = {
  'â†’': '→',
  'â€¢': '•',
  'â€"': '—',
  'AtenÃ§Ã£o': 'Atenção',
  'UsuÃ¡rio': 'Usuário'
};

for (let i = 0; i < lines.length; i++) {
  for (const [bad, good] of Object.entries(mapping)) {
    if (lines[i].includes(bad)) {
      lines[i] = lines[i].split(bad).join(good);
    }
  }
}

// 2. Add imports just before "} from 'lucide-react';"
const importIdx = lines.findIndex(l => l.includes("} from 'lucide-react';"));
if (importIdx !== -1) {
  lines[importIdx] = "  Wallet, Paperclip, History, UserCog, Eye, Cpu, FolderOpen, Key, ArrowLeft, ArrowRight, Camera, Copy, Save, Code, AlertTriangle as ExclamationTriangle, X as Times, Edit as EditAlt, Mail as Envelope, FileText as FileAlt\n} from 'lucide-react';";
}

// 3. Add to iconMap just after "const iconMap: Record<string, any> = {"
const mapIdx = lines.findIndex(l => l.includes("const iconMap: Record<string, any> = {"));
if (mapIdx !== -1) {
  lines.splice(mapIdx + 1, 0, `  'eye': Eye,
  'cpu': Cpu,
  'folder-open': FolderOpen,
  'exclamation-triangle': ExclamationTriangle,
  'key': Key,
  'times': Times,
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
  'id-card': UserIcon,
  'map-marker-alt': MapPin,
  'wallet': Wallet,
  'paperclip': Paperclip,
  'history': History,
  'users-cog': Users,
  'user-tie': Briefcase,
  'shield-check': ShieldCheck,`);
}

// 4. Join and fix LoginPage
let code = lines.join('\n');

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

if (code.includes(loginPageStart)) {
  code = code.replace(loginPageStart, loginPageReplacement);
  code = code.replace(/{systemSettings.appLogo \?/g, `{(appLogo || systemSettings.appLogo) ?`);
  code = code.replace(/src=\{systemSettings.appLogo}/g, `src={appLogo || systemSettings.appLogo}`);
  code = code.replace(/systemSettings.companyName/g, `(appName || systemSettings.companyName)`);
  console.log("LoginPage updated properly.");
} else {
  console.log("Could not find LoginPage start.");
}

fs.writeFileSync('App.tsx', code, 'utf8');
console.log('App.tsx strongly repaired!');
