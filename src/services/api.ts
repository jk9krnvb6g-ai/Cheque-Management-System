/**
 * Frontend API Service (Client-Side Connector to Backend /api & MySQL Database 10.1.0.201)
 * รองรับการเชื่อมต่อกับฐานข้อมูล MySQL 10.1.0.201 เต็มรูปแบบ 100%
 * มีระบบ Auto-detection และ Custom URL สำหรับการรันบน IIS หรือต่างพอร์ต
 */
import { Cheque, BankTemplateConfig, BankType, User, ChequePrintLog, AuditLog } from '../types';

// ฟังก์ชันหา URL ของ Backend API
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '/api';

  // 1. ตรวจสอบว่ามีการระบุ Custom API URL ไว้ใน LocalStorage หรือไม่
  const custom = localStorage.getItem('cheque_sys_api_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }

  // 2. ถ้าเข้าเว็บผ่าน Port 3000 หรือ URL เดียวกับ Backend
  const host = window.location.hostname;
  const port = window.location.port;

  // ถ้าเข้าผ่าน port 3000 อยู่แล้ว ใช้ /api ได้โดยตรง
  if (port === '3000') {
    return '/api';
  }

  // 3. ถ้าเปิดผ่าน IIS (พอร์ต 80, 8080 หรืออื่นๆ ที่ไม่ใช่ 3000)
  // ให้เชื่อมต่อไปยัง Backend Node.js ที่พอร์ต 3000 ของเครื่องเดียวกัน
  const protocol = window.location.protocol;
  return `${protocol}//${host}:3000/api`;
}

export function setCustomApiUrl(url: string): void {
  if (!url || !url.trim()) {
    localStorage.removeItem('cheque_sys_api_url');
  } else {
    localStorage.setItem('cheque_sys_api_url', url.trim());
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errMsg = `HTTP Error ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.message) errMsg = errJson.message;
      } catch {}
      throw new Error(errMsg);
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const apiClient = {
  getApiBaseUrl,
  setCustomApiUrl,

  // 1. Health & Database Status
  async checkHealth(): Promise<{ status: string; database?: any } | null> {
    try {
      return await request<{ status: string; database?: any }>('/health');
    } catch {
      return null;
    }
  },

  async getDbStatus(): Promise<{
    connected: boolean;
    host: string;
    database: string;
    tables: { users: number; cheques: number; items: number; templates: number; printLogs: number; auditLogs: number };
    error: string | null;
  } | null> {
    try {
      const res = await request<any>('/db/status');
      return res;
    } catch {
      return null;
    }
  },

  async testDbConnection(): Promise<{ success: boolean; connected: boolean; status?: any }> {
    try {
      return await request<any>('/db/test', { method: 'POST' });
    } catch (err: any) {
      return { success: false, connected: false, status: { error: err.message } };
    }
  },

  // 2. Cheques
  async getCheques(fiscalYear?: number | 'ALL'): Promise<Cheque[]> {
    const query = fiscalYear && fiscalYear !== 'ALL' ? `?fiscalYear=${fiscalYear}` : '';
    const res = await request<{ success: boolean; data: Cheque[] }>(`/cheques${query}`);
    return res.data || [];
  },

  async getChequeById(id: string): Promise<Cheque | null> {
    const res = await request<{ success: boolean; data: Cheque }>(`/cheques/${encodeURIComponent(id)}`);
    return res.data || null;
  },

  async saveCheque(cheque: Cheque, operator: User): Promise<Cheque> {
    const res = await request<{ success: boolean; data: Cheque }>('/cheques', {
      method: 'POST',
      body: JSON.stringify({ cheque, operator }),
    });
    return res.data;
  },

  async voidCheque(id: string, reason: string, operator: User): Promise<Cheque> {
    const res = await request<{ success: boolean; data: Cheque }>(`/cheques/${encodeURIComponent(id)}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason, operator }),
    });
    return res.data;
  },

  async deleteCheque(id: string, operator: User): Promise<boolean> {
    const res = await request<{ success: boolean }>(`/cheques/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'x-operator': JSON.stringify(operator),
      },
    });
    return res.success;
  },

  // 3. Bank Templates
  async getTemplates(): Promise<Record<BankType, BankTemplateConfig>> {
    const res = await request<{ success: boolean; data: Record<BankType, BankTemplateConfig> }>('/templates');
    return res.data;
  },

  async saveTemplate(bankType: BankType, config: BankTemplateConfig): Promise<BankTemplateConfig> {
    const res = await request<{ success: boolean; data: BankTemplateConfig }>(`/templates/${bankType}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    return res.data;
  },

  async resetTemplates(): Promise<Record<BankType, BankTemplateConfig>> {
    const res = await request<{ success: boolean; data: Record<BankType, BankTemplateConfig> }>('/templates/reset', {
      method: 'POST',
    });
    return res.data;
  },

  // 4. Users & Auth
  async getUsers(): Promise<User[]> {
    const res = await request<{ success: boolean; data: User[] }>('/users');
    return res.data || [];
  },

  async login(username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const res = await request<{ success: boolean; data: User }>('/users/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      return { success: true, user: res.data };
    } catch (err: any) {
      return { success: false, message: err.message || 'เข้าสู่ระบบไม่สำเร็จ' };
    }
  },

  async registerUser(userData: {
    username: string;
    fullName: string;
    position?: string;
    role?: string;
    password?: string;
  }): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const res = await request<{ success: boolean; data: User }>('/users/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      return { success: true, user: res.data };
    } catch (err: any) {
      return { success: false, message: err.message || 'ลงทะเบียนไม่สำเร็จ' };
    }
  },

  async updateUser(
    id: string,
    data: {
      fullName?: string;
      position?: string;
      role?: string;
      status?: string;
      password?: string;
      operator?: User;
    }
  ): Promise<User> {
    const res = await request<{ success: boolean; data: User }>(`/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async deleteUser(id: string, operator: User): Promise<boolean> {
    const res = await request<{ success: boolean }>(`/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'x-operator': JSON.stringify(operator),
      },
    });
    return res.success;
  },

  // 5. Logs (Print & Audit)
  async getPrintLogs(chequeId?: string): Promise<ChequePrintLog[]> {
    const query = chequeId ? `?chequeId=${encodeURIComponent(chequeId)}` : '';
    const res = await request<{ success: boolean; data: ChequePrintLog[] }>(`/logs/print${query}`);
    return res.data || [];
  },

  async recordPrintLog(log: ChequePrintLog): Promise<ChequePrintLog> {
    const res = await request<{ success: boolean; data: ChequePrintLog }>('/logs/print', {
      method: 'POST',
      body: JSON.stringify(log),
    });
    return res.data;
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await request<{ success: boolean; data: AuditLog[] }>('/logs/audit');
    return res.data || [];
  },

  async recordAuditLog(log: AuditLog): Promise<AuditLog> {
    const res = await request<{ success: boolean; data: AuditLog }>('/logs/audit', {
      method: 'POST',
      body: JSON.stringify(log),
    });
    return res.data;
  },

  // 6. Bulk Data Push to MySQL
  async pushAllLocalData(payload: {
    cheques: Cheque[];
    users: User[];
    templates?: Record<string, any>;
    printLogs?: ChequePrintLog[];
    auditLogs?: AuditLog[];
  }): Promise<{ success: boolean; inserted: { cheques: number; items: number; users: number }; error?: string }> {
    return await request('/sync/push', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
