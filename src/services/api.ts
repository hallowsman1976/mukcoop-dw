import { ApiConfig } from '../types';

const URL_KEY = 'coop_api_url_v1';
const MEMBER_TOKEN_KEY = 'coop_member_token_v1';
const ADMIN_TOKEN_KEY = 'coop_admin_token_v1';

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function safeGet(store: Storage, key: string): string {
  try {
    return store.getItem(key) || '';
  } catch {
    return '';
  }
}

function safeSet(store: Storage, key: string, value: string) {
  try {
    if (value) store.setItem(key, value);
    else store.removeItem(key);
  } catch {
    // storage unavailable (private mode) – session just won't survive a reload
  }
}

type Role = 'member' | 'admin';
const TOKEN_KEYS: Record<Role, string> = { member: MEMBER_TOKEN_KEY, admin: ADMIN_TOKEN_KEY };

export const ApiService = {
  getConfig(): ApiConfig {
    const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GAS_URL || '';
    return { webAppUrl: safeGet(localStorage, URL_KEY) || envUrl };
  },

  setUrl(url: string) {
    safeSet(localStorage, URL_KEY, url.trim());
  },

  isConfigured(): boolean {
    return !!this.getConfig().webAppUrl;
  },

  getToken(role: Role): string {
    return safeGet(sessionStorage, TOKEN_KEYS[role]);
  },

  setToken(role: Role, token: string) {
    safeSet(sessionStorage, TOKEN_KEYS[role], token);
  },

  /** POST to the Apps Script web app. text/plain avoids a CORS preflight (Apps Script cannot answer OPTIONS). */
  async call<T>(action: string, payload: unknown = {}, role?: Role): Promise<T> {
    const url = this.getConfig().webAppUrl;
    if (!url) throw new ApiError('NOT_CONFIGURED', 'ยังไม่ได้ตั้งค่า URL ของระบบหลังบ้าน (Google Apps Script)');

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload, token: role ? this.getToken(role) : undefined }),
      });
    } catch {
      throw new ApiError('NETWORK', 'เชื่อมต่อระบบหลังบ้านไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตและ URL ที่ตั้งไว้');
    }

    let body: { ok: boolean; data?: T; code?: string; message?: string };
    try {
      body = await res.json();
    } catch {
      throw new ApiError('BAD_RESPONSE', 'ระบบหลังบ้านตอบกลับในรูปแบบที่ไม่ถูกต้อง (ตรวจสอบว่า deploy เป็น Web App แบบ "ทุกคน" และใช้ URL ที่ลงท้าย /exec)');
    }
    if (!body.ok) {
      if (body.code === 'SESSION_EXPIRED' && role) this.setToken(role, '');
      throw new ApiError(body.code || 'ERROR', body.message || 'เกิดข้อผิดพลาด');
    }
    return body.data as T;
  },

  /** GET ping used by the "test connection" button. Reports the real outcome. */
  async ping(url: string): Promise<{ service: string; version: string }> {
    let res: Response;
    try {
      res = await fetch(url.trim());
    } catch {
      throw new ApiError('NETWORK', 'เชื่อมต่อไม่ได้ (URL ผิด, ไม่ได้ deploy แบบ "ทุกคน" หรือไม่มีอินเทอร์เน็ต)');
    }
    try {
      const body = await res.json();
      if (body?.ok && body.data?.status === 'ONLINE') return body.data;
    } catch {
      // fall through
    }
    throw new ApiError('BAD_RESPONSE', 'URL นี้ไม่ใช่ระบบหลังบ้านของสหกรณ์ (ต้องลงท้าย /exec ของ Web App ที่ deploy แล้ว)');
  },
};
