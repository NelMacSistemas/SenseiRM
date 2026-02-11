
import { AuditEntry } from '../types';

const AUDIT_KEY = 'senseirm_audit_logs';

export const auditService = {
  getLogs: (): AuditEntry[] => {
    try {
      const logs = localStorage.getItem(AUDIT_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (e) {
      console.error("Error loading audit logs", e);
      return [];
    }
  },

  log: (userId: string, userName: string, action: string, module: string, details: string) => {
    const logs = auditService.getLogs();
    const newEntry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      module,
      details,
    };
    // Mantém os últimos 1000 registros para performance
    const updatedLogs = [newEntry, ...logs].slice(0, 1000);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(updatedLogs));
  },

  clearLogs: () => {
    localStorage.removeItem(AUDIT_KEY);
  }
};
