import React from 'react';
import { Language, Summary } from '../types';
import { t } from '../locales/i18n';

interface WeeklySummaryProps {
  summary: Summary | null;
  lang: Language;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ summary, lang }) => {
  if (!summary) return null;
  const w = summary.week;
  const ch = summary.mood_change;

  let change = '';
  if (ch !== null) {
    if (ch === 0) change = t('wkSameT', lang);
    else change = t(ch > 0 ? 'wkUpT' : 'wkDownT', lang).replace('{n}', Math.abs(ch).toFixed(1));
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="mu">{t('streak', lang)}</div>
        <div className="stat">🔥 {summary.streak}</div>
        {summary.streak === 0 && <div className="mu">{t('streakNone', lang)}</div>}
      </div>
      <div className="card">
        <div className="mu">
          {t('wkTitle', lang)}: {t('avgMood', lang)}
        </div>
        <div className="stat">{w.avg_mood !== null ? `${w.avg_mood.toFixed(1)}/5` : '–'}</div>
        <div className="mu">{w.avg_mood === null ? t('wkNone', lang) : change}</div>
      </div>
      <div className="card">
        <div className="mu">{t('wkAnalyses', lang)}</div>
        <div className="stat">{w.analyses}</div>
        <div className="mu">{t('wkDep', lang).replace('{n}', String(w.depressed))}</div>
      </div>
    </div>
  );
};
