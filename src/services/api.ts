/**
 * Frontend API Service (Client-Side Connector to Backend /api & MySQL Database 10.1.0.201)
 * รองรับการเชื่อมต่อกับฐานข้อมูล MySQL 10.1.0.201 เต็มรูปแบบ 100%
 * มีระบบ Auto-detection และ Custom URL สำหรับการรันบน IIS หรือต่างพอร์ต
 */
import { Cheque, BankTemplateConfig, BankType, User, ChequePrintLog, AuditLog } from '../types';

let cachedWorkingUrl: string | null = null;

// ฟังก์ชันหา URL ของ Backend API
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '/api';

  // 1. ตรวจสอบว่ามีการระบุ Custom API URL ไว้ใน LocalStorage หรือไม่
  const custom = localStorage.getItem('cheque_sys_api_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }

  // 2. ถ้าเคยตรวจพบ URL ที่ทำงานได้ก่อนหน้านี้ใน Session
  if (cachedWorkingUrl) {
    return cachedWorkingUrl;
  }

  // 3. ค่าเริ่มต้นสำหรับสภาพแวดล้อมต่างๆ:
  // กรณีเข้าใช้งานผ่าน Path ย่อย (เช่น /Cash_Cheque/ บน IIS หรือ Node)
  const pathname = window.location.pathname || '';
  if (pathname.startsWith('/Cash_Cheque')) {
    return '/Cash_Cheque/api';
  }

  // กรณีทั่วไป: Same-Origin relative path /api (AI Studio Preview, Vite Dev, Node Production)
  return '/api';
}

export function setCustomApiUrl(url: string): void {
  if (!url || !url.trim()) {
    localStorage.removeItem('cheque_sys_api_url');
    cachedWorkingUrl = null;
  } else {
    const clean = url.trim().replace(/\/+$/, '');
    localStorage.setItem('cheque_sys_api_url', clean);
    cachedWorkingUrl = clean;
  }
}

// ฟังก์ชันสแกนหา URL ของ Backend API ที่ทำงานอยู่โดยอัตโนมัติ
export async function autoDetectApiUrl(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const host = window.location.hostname;
  const isHttps = window.location.protocol === 'https:';
  const pathname = window.location.pathname || '';

  const candidates: string[] = [
    // 1. Custom URL ถ้ามี
    ...(localStorage.getItem('cheque_sys_api_url') ? [localStorage.getItem('cheque_sys_api_url')!] : []),
    // 2. Relative URLs (สำหรับ Same-Origin, IIS Reverse Proxy หรือ Node Server)
    pathname.startsWith('/Cash_Cheque') ? '/Cash_Cheque/api' : '/api',
    '/api',
    '/Cash_Cheque/api',
  ];

  // ถ้าหน้าเว็บเปิดด้วย HTTP (หรือบนเครื่อง localhost) สามารถทดสอบ Direct Port 3003 ได้โดยไม่ติด Mixed Content
  if (!isHttps || host === 'localhost' || host === '127.0.0.1') {
    candidates.push(
      `http://${host}:3003/api`,
      `http://${host}:3003/Cash_Cheque/api`,
      'http://localhost:3003/api',
      'http://127.0.0.1:3003/api',
      'http://10.2.0.13:3003/api',
      'http://10.1.0.201:3003/api'
    );
  }

  for (const rawUrl of candidates) {
    const url = rawUrl.replace(/\/+$/, '');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${url}/health`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') {
          cachedWorkingUrl = url;
          localStorage.setItem('cheque_sys_api_url', url);
          return url;
        }
      }
    } catch {
      // ข้าม candidate ที่ติดต่อไม่ได้
    }
  }

  return null;
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
    let msg = err.message || 'การเชื่อมต่อล้มเหลว';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('abort')) {
      msg = `ไม่สามารถติดต่อเซิร์ฟเวอร์ Backend API ที่ [${url}] ได้ — กรุณาตรวจสอบว่าได้เปิด start-backend.bat แล้วหรือยัง`;
    }
    throw new Error(msg);
  }
}

export const apiClient = {
  getApiBaseUrl,
  setCustomApiUrl,
  autoDetectApiUrl,

  // 1. Health & Database Status
  async checkHealth(): Promise<{ status: string; database?: any } | null> {
    try {
      return await request<{ status: string; database?: any }>('/health');
    } catch {
      return null;
    }
  },

  async getDbStatus(): Promise<{
    apiConnected: boolean;
    apiUrl: string;
    connected: boolean;
    host?: string;
    port?: number;
    database?: string;
    error?: string | null;
    apiError?: string | null;
    tables?: { users: number; cheques: number; items: number; templates: number; printLogs: number; auditLogs: number };
  }> {
    const currentUrl = getApiBaseUrl();
    try {
      const res = await request<any>('/db/status');
      return {
        apiConnected: true,
        apiUrl: currentUrl,
        connected: res.connected ?? false,
        host: res.host,
        port: res.port,
        database: res.database,
        error: res.error || null,
        apiError: null,
        tables: res.counts ? {
          users: res.counts.users || 0,
          cheques: res.counts.cheques || 0,
          items: res.counts.chequeItems || 0,
          templates: res.counts.templates || 0,
          printLogs: res.counts.printLogs || 0,
          auditLogs: res.counts.auditLogs || 0,
        } : (res.tables || { users: 0, cheques: 0, items: 0, templates: 0, printLogs: 0, auditLogs: 0 }),
      };
    } catch (err: any) {
      return {
        apiConnected: false,
        apiUrl: currentUrl,
        connected: false,
        apiError: err.message,
        error: err.message,
      };
    }
  },

  async testDbConnection(): Promise<{ success: boolean; connected: boolean; status?: any }> {
    try {
      return await request<any>('/db/test', { method: 'POST' });
    } catch (err: any) {
      return { success: false, connected: false, status: { error: err.message } };
    }
  },

  async updateDbConfig(config: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  }): Promise<{ success: boolean; connected: boolean; error: string | null; config?: any }> {
    return await request<any>('/db/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
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
