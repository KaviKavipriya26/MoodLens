import React from 'react';
import { AnalysisResult } from '../types';

interface HighlightedProps {
  result: AnalysisResult;
}

// keeps letters (English + Tamil), combining marks and apostrophes
const norm = (s: string): string => s.toLowerCase().replace(/\u2019/g, "'").replace(/[^\p{L}\p{M}']/gu, '');

export const Highlighted: React.FC<HighlightedProps> = ({ result }) => {
  const parts = result.text.split(/(\s+)/);
  return (
    <span>
      {parts.map((w, i) => {
        const c = norm(w);
        const s = result.slang.find((o) => o.k === c);
        const x = result.words.find((o) => o.w === c);
        if (s) {
          return (
            <mark key={i} className="sl" title={s.m}>
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
