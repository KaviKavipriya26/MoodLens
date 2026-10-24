import React from 'react';
import { AnalysisResult } from '../types';
import { SL } from '../services/api';

interface HighlightedProps {
  result: AnalysisResult;
}

export const Highlighted: React.FC<HighlightedProps> = ({ result }) => {
  const parts = result.text.split(/(\s+)/);
  return (
    <span>
      {parts.map((w, i) => {
        const c = w.toLowerCase().replace(/[^a-z]/g, '');
        const x = result.words.find((o) => o.w === c);
        const s = SL[c];
        if (s) {
          return (
            <mark key={i} className="sl" title={s}>
              {w}
            </mark>
          );
        }
        if (x) {
          return (
            <mark key={i} className={x.v > 0 ? 'r' : 'gr'}>
              {w}
            </mark>
          );
        }
        return <React.Fragment key={i}>{w}</React.Fragment>;
      })}
    </span>
  );
};
