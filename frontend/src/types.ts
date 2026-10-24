export type Page =
  | 'home'
  | 'login'
  | 'dash'
  | 'analyze'
  | 'bulk'
  | 'journal'
  | 'history'
  | 'reports'
  | 'settings'
  | 'about';

export type Language = 'en' | 'ta';
export type Theme = 'light' | 'dark';

export interface User {
  name: string;
  email: string;
}

export interface WordAttribution {
  w: string;
  v: number;
}

export interface EmojiItem {
  e: string;
  m: string;
  s: string;
}

export interface SlangItem {
  k: string;
  m: string;
}

export interface EmotionScores {
  Sadness: number;
  Anger: number;
  Fear: number;
  Joy: number;
  Neutral: number;
}

export interface AnalysisResult {
  id?: number;
  text: string;
  label: 'Depressed' | 'Non-Depressed';
  conf: number;
  sev: 'Low' | 'Moderate' | 'High';
  pol: number;
  emo: EmotionScores;
  emojis: EmojiItem[];
  slang: SlangItem[];
  words: WordAttribution[];
  date: string;
}

export interface MoodEntry {
  id?: number;
  m: number;
  d: string;
  n?: string;
}

export interface ReportSummary {
  total: number;
  depressed: number;
  non_depressed: number;
}
