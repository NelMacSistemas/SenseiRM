
import { AuditEntry } from '../types';

export const auditService = {
  getLogs: async (): Promise<AuditEntry[]> => {
    try {
      const token = localStorage.getItem('senseirm_token');
      const res = await fetch('/api/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.auditLogs || [];
      } else if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('senseirm_token');
        localStorage.removeItem('senseirm_current_user');
        window.location.reload();
      }
      return [];
    } catch (e) {
      console.error("Error loading audit logs", e);
      return [];
    }
  },

  log: async (userId: string, userName: string, action: string, module: string, details: string) => {
    try {
      const token = localStorage.getItem('senseirm_token');
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, module, details })
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('senseirm_token');
        localStorage.removeItem('senseirm_current_user');
        window.location.reload();
      }
    } catch (e) {
      console.error("Error saving audit log", e);
    }
  },

  clearLogs: () => {
    // Not implemented in backend for security reasons
  }
};
