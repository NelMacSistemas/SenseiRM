const fs = require('fs');

let code = fs.readFileSync('App.tsx', 'utf8');

const regex = /const LoginPage = \(\) => \{\s*const \{ login, currentUser, systemSettings \} = useApp\(\);\s*const \[error, setError\] = useState\(''\);\s*if \(currentUser\) return <Navigate to="\/dashboard" \/>;/;

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

code = code.replace(regex, loginPageReplacement);
code = code.replace(/{systemSettings.appLogo \?/g, `{(appLogo || systemSettings.appLogo) ?`);
code = code.replace(/src=\{systemSettings.appLogo}/g, `src={appLogo || systemSettings.appLogo}`);
code = code.replace(/systemSettings.companyName/g, `(appName || systemSettings.companyName)`);

fs.writeFileSync('App.tsx', code, 'utf8');
console.log('LoginPage and company string fixed perfectly.');
