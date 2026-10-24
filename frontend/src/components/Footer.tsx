import React from 'react';
import { Language } from '../types';
import { t } from '../locales/i18n';

interface FooterProps {
  lang: Language;
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  return (
    <footer className="foot" id="foot">
      ⚠ {t('disc', lang)}
    </footer>
  );
};
