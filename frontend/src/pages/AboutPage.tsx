import React from 'react';
import { Language } from '../types';
import { t } from '../locales/i18n';

interface AboutPageProps {
  lang: Language;
}

export const AboutPage: React.FC<AboutPageProps> = ({ lang }) => {
  return (
    <div className="wrap">
      <div className="card">
        <h2>{t('about', lang)}</h2>
        <p style={{ margin: '16px 0', lineHeight: 1.7 }}>
          {t('aboutT', lang)}
        </p>
        <p className="mu" style={{ fontStyle: 'italic' }}>
          {t('disc', lang)}
        </p>
      </div>
    </div>
  );
};
