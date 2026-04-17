const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

const t1 = '{users.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}';
const r1 = '{users.filter(u => u.status !== EntityStatus.INACTIVE && u.status !== EntityStatus.BLOCKED).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}';
content = content.replace(t1, r1);

const t2 = '{users.map(u => <option key={u.id} value={u.id} className="dark:bg-slate-900">{u.nome}</option>)}';
const r2 = '{users.filter(u => u.status !== EntityStatus.INACTIVE && u.status !== EntityStatus.BLOCKED).map(u => <option key={u.id} value={u.id} className="dark:bg-slate-900">{u.nome}</option>)}';
content = content.replace(t2, r2);

const t3 = "if (type === 'whatsapp' && !c.telefoneSecundario && !c.telefonePrincipal) return false;";
const r3 = "if (type === 'whatsapp' && !c.telefoneSecundario && !c.telefonePrincipal) return false;\n\n      // Business Rule: Do not show inactive or blocked clients\n      if (c.status === EntityStatus.INACTIVE || c.status === EntityStatus.BLOCKED) return false;";
content = content.replace(t3, r3);

fs.writeFileSync('App.tsx', content);
console.log("App.tsx replaced successfully.");
