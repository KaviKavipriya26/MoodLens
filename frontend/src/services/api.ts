import { AnalysisResult, MoodEntry } from '../types';

export const BASE = 'http://127.0.0.1:8000';

export const EP = {
  login: `${BASE}/api/login`,
  register: `${BASE}/api/register`,
  analyze: `${BASE}/api/analyze`,
  bulk: `${BASE}/api/bulk-analyze`,
  history: `${BASE}/api/history`,
  mood: `${BASE}/api/mood`,
  report: `${BASE}/api/report`,
};

export const NEG = 'sad tired alone hopeless worthless cry empty hate nothing lost numb exhausted'.split(' ');
export const POS = 'happy great love good fun excited thanks better grateful'.split(' ');
export const SL: Record<string, string> = {
  idk: 'I don’t know',
  tbh: 'to be honest',
  ngl: 'not gonna lie',
  idc: 'I don’t care',
  smh: 'shaking my head',
  rn: 'right now',
  imo: 'in my opinion',
};

export const EM: Record<string, [string, string]> = {
  '😢': ['Crying', 'negative'],
  '😭': ['Sobbing', 'negative'],
  '😞': ['Disappointed', 'negative'],
  '💔': ['Broken heart', 'negative'],
  '😊': ['Smiling', 'positive'],
  '😂': ['Laughing', 'positive'],
  '❤️': ['Love', 'positive'],
  '😐': ['Neutral face', 'neutral'],
};

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

export function mockAnalyze(x: string): AnalysisResult {
  const tok = x.split(/\s+/);
  const words: { w: string; v: number }[] = [];
  let s = 0;

  tok.forEach((w) => {
    const c = w.toLowerCase().replace(/[^a-z]/g, '');
    const v = NEG.includes(c)
      ? 0.35 + (c.length % 3) * 0.1
      : POS.includes(c)
      ? -0.3
      : 0;
    if (v) words.push({ w: c, v: +v.toFixed(2) });
    s += v;
  });

  const emojis = Object.keys(EM)
    .filter((e) => x.includes(e))
    .map((e) => ({ e, m: EM[e][0], s: EM[e][1] }));

  emojis.forEach((e) => {
    s += e.s === 'negative' ? 0.3 : e.s === 'positive' ? -0.3 : 0;
  });

  const slang = Object.keys(SL)
    .filter((k) => tok.some((w) => w.toLowerCase().replace(/[^a-z]/g, '') === k))
    .map((k) => ({ k, m: SL[k] }));

  const dep = s > 0.3;
  const conf = Math.round(58 + Math.min(38, Math.abs(s) * 22));
  const sev: 'Low' | 'Moderate' | 'High' = !dep ? 'Low' : s > 1.1 ? 'High' : s > 0.6 ? 'Moderate' : 'Low';
  const pol = Math.max(-1, Math.min(1, -s / 2.2));
  const emo = {
    Sadness: Math.max(5, Math.round(30 + s * 30)),
    Anger: 12,
    Fear: Math.max(5, Math.round(15 + s * 10)),
    Joy: Math.max(4, Math.round(30 - s * 30)),
    Neutral: 20,
  };

  return {
    label: dep ? 'Depressed' : 'Non-Depressed',
    conf,
    sev,
    emojis,
    slang,
    words,
    emo,
    pol: +pol.toFixed(2),
    text: x,
    date: new Date().toISOString().slice(0, 10),
  };
}

export const initialHistory: AnalysisResult[] = [
  ['I feel so tired and empty lately 😢 idk why', '2026-10-20'],
  ['Great day with friends, so happy 😊', '2026-10-19'],
  ['tbh nothing matters rn, feeling lost 💔', '2026-10-17'],
  ['Thanks for the support, feeling better', '2026-10-15'],
  ['Just another normal Monday 😐', '2026-10-12'],
  ['alone again, everything feels hopeless', '2026-10-10'],
].map(([x, d]) => ({ ...mockAnalyze(x), date: d }));

export const initialJournal: MoodEntry[] = [
  { m: 5, d: '2026-10-21', n: 'Lovely walk' },
  { m: 3, d: '2026-10-20', n: 'Okay day' },
  { m: 2, d: '2026-10-18', n: 'Low energy' },
  { m: 4, d: '2026-10-16', n: 'Good chat' },
  { m: 1, d: '2026-10-13', n: 'Hard day' },
];

export async function apiCall<T = any>(
  ep: string,
  body?: any,
  method: 'GET' | 'POST' | 'DELETE' = 'POST',
  onErrorToast?: (msg: string) => void
): Promise<T> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const tk = ls.get('ms_token');
  if (tk) h.Authorization = 'Bearer ' + tk;

  let r: Response;
  try {
    r = await fetch(ep, {
      method,
      headers: h,
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (onErrorToast) onErrorToast('Cannot reach backend. Is Django running?');
    throw e;
  }

  if (!r.ok) {
    const errObj = await r.json().catch(() => ({}));
    const msg = errObj.error || errObj.detail || 'Error ' + r.status;
    if (onErrorToast) onErrorToast(msg);
    throw new Error(msg);
  }

  if (r.status === 204) {
    return {} as T;
  }
  return r.json();
}
