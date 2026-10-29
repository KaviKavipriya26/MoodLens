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
  id?: string | null;
  text: string;
  label: 'Depressed' | 'Non-Depressed';
  conf: number;
  sev: 'Low' | 'Moderate' | 'High';
  pol: number;
  p?: number | null;
  crisis?: boolean;
  emo: EmotionScores;
  emojis: EmojiItem[];
  slang: SlangItem[];
  words: WordAttribution[];
  date: string;
}

export interface MoodAnalysis {
  label: 'Depressed' | 'Non-Depressed';
  conf: number;
  sev: 'Low' | 'Moderate' | 'High';
  p?: number | null;
  crisis?: boolean;
}

export interface MoodEntry {
  id?: string;
  m: number;
  d: string;
  n?: string;
  a?: MoodAnalysis | null;
}

export interface ReportSummary {
  total: number;
  depressed: number;
  non_depressed: number;
  avg_risk: number | null;
  avg_mood: number | null;
  mood_entries: number;
}

export interface WeekStats {
  avg_mood: number | null;
  mood_entries: number;
  analyses: number;
  depressed: number;
  avg_risk: number | null;
}

export interface SeriesPoint {
  date: string;
  mood: number | null;
  risk: number | null;
}

export type SupportStatus = 'none' | 'low' | 'mid' | 'good';

export interface Summary {
  streak: number;
  logged_today: boolean;
  week: WeekStats;
  prev_week: WeekStats;
  mood_change: number | null;
  negative_run: number;
  trend_alert: boolean;
  trend_alert_days: number;
  status: SupportStatus;
  series: SeriesPoint[];
}

export interface ModelEval {
  engine: string;
  samples: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusion: { tp: number; fp: number; fn: number; tn: number };
  evaluated_on: string;
  evaluated_at: string;
}

export interface ModelInfo {
  engine: string;
  trained_model_loaded: boolean;
  metrics: ModelEval | null;
}

export interface ReminderConfig {
  enabled: boolean;
  time: string;
}
