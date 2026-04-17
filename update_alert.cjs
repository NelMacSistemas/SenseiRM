const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

const t1 = `interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isDestructive?: boolean;
}`;
const r1 = `interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isDestructive?: boolean;
  hideCancel?: boolean;
}`;
content = content.replace(t1, r1);

const t2 = `              <button 
                onClick={handleCancel}
                className="px-6 py-3 rounded-xl font-bold bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm"
              >
                {options.cancelLabel || 'Cancelar'}
              </button>`;
const r2 = `              {options.hideCancel !== true && (
                <button 
                  onClick={handleCancel}
                  className="px-6 py-3 rounded-xl font-bold bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm"
                >
                  {options.cancelLabel || 'Cancelar'}
                </button>
              )}`;
content = content.replace(t2, r2);

const t3 = `const UsersPage = () => {
  const { users, addUser, updateUser, currentUser, hasPermission, roles, tasks, sectors } = useApp();
  const { toast } = useToast();`;
const r3 = `const UsersPage = () => {
  const { users, addUser, updateUser, currentUser, hasPermission, roles, tasks, sectors } = useApp();
  const { toast } = useToast();
  const confirmDialog = useConfirm();`;
content = content.replace(t3, r3);

const t4 = `      if (errorMsg) {
        if (toast) toast({ message: errorMsg, type: 'error' });
        return;
      }`;
const r4 = `      if (errorMsg) {
        confirmDialog.confirm({
          title: 'Inativação Bloqueada',
          message: errorMsg,
          confirmLabel: 'Entendi',
          isDestructive: true,
          hideCancel: true,
          onConfirm: () => {}
        });
        return;
      }`;
content = content.replace(t4, r4);

fs.writeFileSync('App.tsx', content);
console.log("App.tsx fix applied successfully!");
