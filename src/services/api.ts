/**
 * Frontend API Service (Client-Side Connector to Backend /api)
 * Automatically connects to Express backend endpoints,
 * with fallback to StorageService for zero-downtime offline execution.
 */
import { Cheque, BankTemplateConfig, BankType, User, ChequePrintLog, AuditLog } from '../types';
import { StorageService } from '../utils/storage';

const API_BASE = '/api';

export const apiClient = {
  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  },

  // Cheques API
  async getCheques(fiscalYear?: number | 'ALL'): Promise<Cheque[]> {
    try {
      const url = new URL(`${window.location.origin}${API_BASE}/cheques`);
      if (fiscalYear && fiscalYear !== 'ALL') {
        url.searchParams.set('fiscalYear', String(fiscalYear));
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      return json.data;
    } catch {
      // Fallback to local storage
      const all = StorageService.getCheques();
      if (fiscalYear && fiscalYear !== 'ALL') {
        return all.filter(c => c.fiscalYear === fiscalYear);
      }
      return all;
    }
  },

  async saveCheque(cheque: Cheque, operator: User): Promise<Cheque> {
    try {
      const res = await fetch(`${API_BASE}/cheques`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cheque, operator }),
      });
      if (!res.ok) throw new Error('API save error');
      const json = await res.json();
      // Sync local storage as well
      StorageService.saveCheque(json.data, operator);
      return json.data;
    } catch {
      return StorageService.saveCheque(cheque, operator);
    }
  },

  async voidCheque(id: string, reason: string, operator: User): Promise<Cheque | null> {
    try {
      const res = await fetch(`${API_BASE}/cheques/${id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, operator }),
      });
      if (!res.ok) throw new Error('API void error');
      const json = await res.json();
      StorageService.voidCheque(id, reason, operator);
      return json.data;
    } catch {
      return StorageService.voidCheque(id, reason, operator);
    }
  },

  async deleteCheque(id: string, operator: User): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/cheques/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('API delete error');
      StorageService.deleteCheque(id, operator);
      return true;
    } catch {
      StorageService.deleteCheque(id, operator);
      return true;
    }
  },

  // Bank Templates API
  async getTemplates(): Promise<Record<BankType, BankTemplateConfig>> {
    try {
      const res = await fetch(`${API_BASE}/templates`);
      if (!res.ok) throw new Error('API templates error');
      const json = await res.json();
      return json.data;
    } catch {
      return StorageService.getTemplates();
    }
  },

  // Users API
  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (!res.ok) throw new Error('API users error');
      const json = await res.json();
      return json.data;
    } catch {
      return StorageService.getUsers();
    }
  },

  // Print Logs API
  async getPrintLogs(chequeId?: string): Promise<ChequePrintLog[]> {
    try {
      const url = new URL(`${window.location.origin}${API_BASE}/logs/print`);
      if (chequeId) url.searchParams.set('chequeId', chequeId);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('API logs error');
      const json = await res.json();
      return json.data;
    } catch {
      return StorageService.getPrintLogs(chequeId);
    }
  },
};
