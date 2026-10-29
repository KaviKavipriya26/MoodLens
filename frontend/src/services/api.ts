import { MoodEntry } from '../types';

export const BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'http://127.0.0.1:8000';

export const EP = {
  login: `${BASE}/api/login`,
  register: `${BASE}/api/register`,
  profile: `${BASE}/api/profile`,
  changePassword: `${BASE}/api/change-password`,
  deleteAccount: `${BASE}/api/delete-account`,
  analyze: `${BASE}/api/analyze`,
  bulk: `${BASE}/api/bulk-analyze`,
  history: `${BASE}/api/history`,
  mood: `${BASE}/api/mood`,
  summary: `${BASE}/api/summary`,
  metrics: `${BASE}/api/metrics`,
  report: `${BASE}/api/report`,
};

export const UNAUTH_EVENT = 'ms-unauthorized';

export const ls = {
  get: (k: string): string | null => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string): void => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // ignore storage error
    }
  },
  remove: (k: string): void => {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  },
};

export const pad = (n: number): string => String(n).padStart(2, '0');

/** Local-date YYYY-MM-DD, `offset` days from today (not UTC, so it is right in India early morning). */
export const addDays = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const todayStr = (): string => addDays(0);

export const mapMoods = (list: any[]): MoodEntry[] =>
  (Array.isArray(list) ? list : []).map((x) => ({
    id: x.id,
    m: x.mood,
    d: x.date,
    n: x.note,
    a: x.analysis ?? null,
  }));

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

const NO_LOGOUT_ON_401 = [EP.login, EP.register];

function authHeader(): Record<string, string> {
  const tk = ls.get('ms_token');
  return tk ? { Authorization: 'Bearer ' + tk } : {};
}

/** Session expired / invalid token: clear it and tell the app to log out. Returns false for login/register. */
function handleUnauthorized(ep: string): boolean {
  if (NO_LOGOUT_ON_401.includes(ep)) return false;
  ls.remove('ms_token');
  ls.remove('ms_user');
  window.dispatchEvent(new Event(UNAUTH_EVENT));
  return true;
}

export async function apiCall<T = any>(
  ep: string,
  body?: any,
  method: Method = 'POST',
  onErrorToast?: (msg: string) => void
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeader() };

  let r: Response;
  try {
    r = await fetch(ep, {
      method,
      headers,
      body: (method === 'POST' || method === 'PUT') && body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    const msg = 'Cannot reach backend. Is Django running?';
    if (onErrorToast) onErrorToast(msg);
    throw new Error(msg);
  }

  if (!r.ok) {
    const errObj = await r.json().catch(() => ({}));
    const msg = errObj.error || errObj.detail || 'Error ' + r.status;
    const loggedOut = r.status === 401 && handleUnauthorized(ep.split('?')[0]);
    if (!loggedOut && onErrorToast) onErrorToast(msg);
    throw new Error(msg);
  }

  if (r.status === 204) {
    return {} as T;
  }
  return r.json();
}

/** Authenticated file download (CSV / PDF from the backend). */
export async function downloadFile(url: string, filename: string): Promise<void> {
  let r: Response;
  try {
    r = await fetch(url, { headers: authHeader() });
  } catch {
    throw new Error('Cannot reach backend. Is Django running?');
  }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    if (r.status === 401) handleUnauthorized(url.split('?')[0]);
    throw new Error(e.error || 'Error ' + r.status);
  }
  const blob = await r.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(href);
}
