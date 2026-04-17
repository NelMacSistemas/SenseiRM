const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

const t1 = 'const { users, addUser, updateUser, currentUser, hasPermission, roles } = useApp();';
const r1 = 'const { users, addUser, updateUser, currentUser, hasPermission, roles, tasks, sectors } = useApp();';

content = content.replace(t1, r1);

const t2 = `    if (canManageUsers) {
      u.roleId = modalRoleId;
    }
    if (editingUser) updateUser(u); else addUser(u);`;
const r2 = `    if (editingUser && editingUser.status !== 'inativo' && u.status === 'inativo') {
      const hasPendingTasks = tasks.some(t => (t.responsavelId === u.id || t.solicitanteId === u.id) && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELED);
      const activeSector = sectors.find(s => s.responsavelId === u.id);
      
      let errorMsg = '';
      if (hasPendingTasks && activeSector) {
        errorMsg = \`O usuário não pode ser inativado pois está vinculado a tarefas pendentes e é responsável pelo setor "\${activeSector.nome}".\`;
      } else if (hasPendingTasks) {
        errorMsg = 'O usuário não pode ser inativado pois está vinculado a tarefas pendentes.';
      } else if (activeSector) {
        errorMsg = \`O usuário não pode ser inativado pois é responsável pelo setor "\${activeSector.nome}".\`;
      }
      
      if (errorMsg) {
        if (toast) toast({ message: errorMsg, type: 'error' });
        return;
      }
    }

    if (canManageUsers) {
      u.roleId = modalRoleId;
    }
    if (editingUser) updateUser(u); else addUser(u);`;

content = content.replace(t2, r2);

fs.writeFileSync('App.tsx', content);
console.log("App.tsx fixed successfully!");
