import React from 'react';
import { Language, Page, User } from '../types';
import { t } from '../locales/i18n';

interface HomePageProps {
  user: User | null;
  lang: Language;
  onNavigate: (page: Page) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ user, lang, onNavigate }) => {
  return (
    <div>
      <section className="hero">
        <h1>🧠 {t('hero', lang)}</h1>
        <p className="mu" style={{ fontSize: '18px', marginTop: '10px' }}>
          {t('tag', lang)}
        </p>
        <button
          type="button"
          className="btn"
          style={{ marginTop: '20px' }}
          onClick={() => onNavigate(user ? 'analyze' : 'login')}
        >
          {t('cta', lang)}
        </button>
      </section>

      <div className="wrap">
        <p style={{ textAlign: 'center', maxWidth: '680px', margin: 'auto' }}>
          {t('desc', lang)}
        </p>

        <h2 style={{ textAlign: 'center', marginTop: '30px' }}>
          {t('how', lang)}
        </h2>

        <div className="grid" style={{ marginTop: '16px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card step">
              <b>{i}</b>
              <div style={{ marginTop: '4px' }}>
                {t(`s${i}` as any, lang)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="wrap mu" style={{ textAlign: 'center', marginTop: '20px' }}>
        <b>{t('foot1', lang)}</b>
        <br />
        {t('guide', lang)}
        <br />
        {t('team', lang)}
      </footer>
    </div>
  );
};
