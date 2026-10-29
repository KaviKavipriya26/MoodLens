import React, { useEffect, useState } from 'react';
import { Language, SupportStatus } from '../types';
import { t } from '../locales/i18n';

interface SuggestionsProps {
  status: SupportStatus;
  lang: Language;
}

const TIPS: Record<SupportStatus, string[]> = {
  low: ['tipLow1', 'tipLow2', 'tipLow3', 'tipLow4', 'tipLow5'],
  mid: ['tipMid1', 'tipMid2', 'tipMid3'],
  good: ['tipGood1', 'tipGood2', 'tipGood3'],
  none: [],
};
const INTRO: Record<SupportStatus, string> = { low: 'sugLow', mid: 'sugMid', good: 'sugGood', none: 'sugNone' };

// box breathing: 4s in, 4s hold, 4s out, 4s hold
const PHASES: string[] = ['breatheIn', 'breatheHold', 'breatheOut', 'breatheHold'];

const Breathing: React.FC<{ lang: Language }> = ({ lang }) => {
  const [on, setOn] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!on) return;
    const id = window.setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), 4000);
    return () => window.clearTimeout(id);
  }, [on, phase]);

  useEffect(() => {
    if (!on) return;
    const id = window.setTimeout(() => setOn(false), 60000);
    return () => window.clearTimeout(id);
  }, [on]);

  const toggle = () => {
    setPhase(0);
    setOn((v) => !v);
  };
  const big = on && (phase === 0 || phase === 1);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
      <div className="breath" style={{ transform: `scale(${on ? (big ? 1.25 : 0.8) : 1})` }}>
        {on ? t(PHASES[phase], lang) : ''}
      </div>
      <button type="button" className="btn g" onClick={toggle}>
        {on ? t('breatheStop', lang) : t('breatheBtn', lang)}
      </button>
    </div>
  );
};

export const Suggestions: React.FC<SuggestionsProps> = ({ status, lang }) => (
  <div className="card">
    <h3>{t('sugT', lang)}</h3>
    <p className="mu" style={{ margin: '6px 0' }}>
      {t(INTRO[status], lang)}
    </p>
    {TIPS[status].length > 0 && (
      <ul className="tips">
        {TIPS[status].map((k) => (
          <li key={k}>{t(k, lang)}</li>
        ))}
      </ul>
    )}
    <Breathing lang={lang} />
  </div>
);
