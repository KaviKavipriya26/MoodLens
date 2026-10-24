import React from 'react';
import { Language, Page, User } from '../types';
import { t } from '../locales/i18n';

interface NavbarProps {
  user: User | null;
  lang: Language;
  onNavigate: (page: Page) => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  lang,
  onNavigate,
  onToggleTheme,
  onToggleLang,
  onLogout,
}) => {
  return (
    <nav className="nav">
      <span
        className="brand"
        onClick={() => onNavigate(user ? 'dash' : 'home')}
      >
        🧠 MindScan
      </span>
      <a
        href="#about"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('about');
        }}
        style={{ cursor: 'pointer' }}
      >
        {t('about', lang)}
      </a>
      <button
        type="button"
        className="btn g"
        onClick={onToggleTheme}
        aria-label={t('theme', lang)}
        title={t('theme', lang)}
      >
        ◐
      </button>
      <button
        type="button"
        className="btn g"
        onClick={onToggleLang}
        aria-label={t('lang', lang)}
      >
        {lang === 'en' ? 'தமிழ்' : 'EN'}
      </button>
      {user ? (
        <button
          type="button"
          className="btn g"
          onClick={onLogout}
        >
          {t('logout', lang)}
        </button>
      ) : (
        <button
          type="button"
          className="btn"
          onClick={() => onNavigate('login')}
        >
          {t('login', lang)}
        </button>
      )}
    </nav>
  );
};
