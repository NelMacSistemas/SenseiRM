const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

const regex1 = /if\s*\(data\.users\s*&&\s*data\.users\.length\s*>\s*0\)\s*setUsers\(data\.users\);\s*if\s*\(data\.roles\s*&&\s*data\.roles\.length\s*>\s*0\)\s*setRoles\(data\.roles\);\s*setClients\(data\.clients\s*\|\|\s*\[\]\);\s*setTasks\(data\.tasks\s*\|\|\s*\[\]\);\s*setSectors\(data\.sectors\s*\|\|\s*\[\]\);\s*setClientCategories\(data\.clientCategories\s*\|\|\s*\[\]\);/g;

const replace1 = `if (data.users && data.users.length > 0) setUsers(data.users);
        if (data.roles && data.roles.length > 0) setRoles(data.roles);
        setClients(data.clients || []);
        setTasks(data.tasks || []);
        setSectors(data.sectors || []);
        setClientCategories(data.clientCategories || []);
        setCustomFields(data.customFields || []);
        setHistory(data.history || []);
        setTemplates(data.templates || []);
        setAuditLogs(data.auditLogs || []);
        if (data.slaSettings) setSlaSettings(data.slaSettings);
        if (data.emailSettings) setEmailSettings(data.emailSettings);
        if (data.systemSettings) setSystemSettings(data.systemSettings);
        if (data.notifications) setNotifications(data.notifications);`;

const regex2 = /useEffect\(\(\)\s*=>\s*\{\s*const\s*token\s*=\s*localStorage\.getItem\('senseirm_token'\);\s*if\s*\(token\s*&&\s*!currentUser\)\s*\{\s*loadData\(\);\s*\}\s*\},\s*\[currentUser\]\);/g;

const replace2 = `useEffect(() => {
    const token = localStorage.getItem('senseirm_token');
    if (token) {
      loadData();
    }
  }, []);`;

if (regex1.test(code)) {
  code = code.replace(regex1, replace1);
  console.log('Replaced target 1');
} else {
  console.log('Target 1 not found');
}

if (regex2.test(code)) {
  code = code.replace(regex2, replace2);
  console.log('Replaced target 2');
} else {
  console.log('Target 2 not found');
}

fs.writeFileSync('App.tsx', code);
