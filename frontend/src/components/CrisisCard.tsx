import React from 'react';
import { Language } from '../types';
import { t } from '../locales/i18n';

interface CrisisCardProps {
  lang: Language;
}

export const CrisisCard: React.FC<CrisisCardProps> = ({ lang }) => (
  <div className="crisis" role="alert">
    <strong>{t('crisisT', lang)}</strong>
    <p>{t('crisisP', lang)}</p>
    <ul>
      <li>
        <a href="tel:14416">Tele-MANAS 14416</a> (1-800-891-4416): {t('crisis247', lang)}
      </li>
      <li>
        <a href="tel:104">104</a>: {t('crisisTN', lang)}
      </li>
      <li>
        <a href="tel:+914424640050">044-24640050</a>: {t('crisisSneha', lang)}
      </li>
      <li>
        <a href="tel:112">112</a>: {t('crisisEmerg', lang)}
      </li>
    </ul>
  </div>
);
