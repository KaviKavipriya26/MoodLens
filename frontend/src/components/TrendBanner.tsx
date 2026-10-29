import React from 'react';
import { Language, Summary } from '../types';
import { t } from '../locales/i18n';

interface TrendBannerProps {
  summary: Summary | null;
  lang: Language;
}

export const TrendBanner: React.FC<TrendBannerProps> = ({ summary, lang }) => {
  if (!summary) return null;
  const run = summary.negative_run;
  if (!summary.trend_alert && run < 3) return null;

  const high = summary.trend_alert;
  return (
    <div className={`banner ${high ? 'hi' : 'soft'}`} role="status">
      <span>{t(high ? 'alertHigh' : 'alertSoft', lang).replace('{n}', String(run))}</span>
      {high && (
        <a className="btn" href="tel:14416" style={{ textDecoration: 'none', flexShrink: 0 }}>
          {t('alertCall', lang)}
        </a>
      )}
    </div>
  );
};
