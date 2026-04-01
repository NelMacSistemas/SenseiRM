
import { AuditEntry } from '../types';

export const auditService = {
  getLogs: async (): Promise<AuditEntry[]> => {
    console.log('auditService.getLogs called');
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
        console.log('Reloading page due to 401/403 in getLogs');
        window.location.reload();
      }
      return [];
    } catch (e) {
      console.error("Error loading audit logs", e);
      return [];
    }
  },

  log: async (userId: string, userName: string, action: string, module: string, details: string, entityId?: string, diff?: { field: string; oldValue: any; newValue: any }[]) => {
    console.log('auditService.log called for:', action);
    try {
      const token = localStorage.getItem('senseirm_token');
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, module, details, entityId, diff })
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('senseirm_token');
        localStorage.removeItem('senseirm_current_user');
        console.log('Reloading page due to 401/403 in log');
        window.location.reload();
      }
    } catch (e) {
      console.error("Error saving audit log", e);
    }
  },

  clearLogs: async (reason: string) => {
    try {
      const token = localStorage.getItem('senseirm_token');
      const res = await fetch('/api/audit/clear', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('senseirm_token');
        localStorage.removeItem('senseirm_current_user');
        console.log('Reloading page due to 401/403 in clearLogs');
        window.location.reload();
        return false;
      }
      if (res.status === 429) {
        throw new Error('Muitas requisições ao servidor. Por favor, aguarde um momento.');
      }
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao limpar logs');
      }
      return true;
    } catch (e: any) {
      console.error("Error clearing audit logs", e);
      throw e;
    }
  }
};
