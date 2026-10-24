import React, { useState } from 'react';
import { Language, User } from '../types';
import { t } from '../locales/i18n';

interface SettingsPageProps {
  user: User | null;
  lang: Language;
  onToast: (msg: string) => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onUpdateUser: (user: User) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  lang,
  onToast,
  onToggleTheme,
  onToggleLang,
  onUpdateUser,
}) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      onUpdateUser({ ...user, name, email });
    }
    onToast(t('saved', lang));
  };

  return (
    <div>
      <h2>{t('settings', lang)}</h2>

      <div className="card">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label>
            {t('name', lang)}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ marginTop: '4px' }}
            />
          </label>

          <label>
            {t('email', lang)}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginTop: '4px' }}
            />
          </label>

          <label>
            {t('pwd', lang)}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ marginTop: '4px' }}
            />
          </label>

          <p style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0' }}>
            <span>
              {t('theme', lang)}:{' '}
              <button
                type="button"
                className="btn g"
                onClick={onToggleTheme}
                style={{ padding: '6px 12px' }}
              >
                ◐
              </button>
            </span>
            <span>
              {t('lang', lang)}:{' '}
              <button
                type="button"
                className="btn g"
                onClick={onToggleLang}
                style={{ padding: '6px 12px' }}
              >
                {lang === 'en' ? 'தமிழ்' : 'English'}
              </button>
            </span>
          </p>

          <div>
            <button type="submit" className="btn">
              {t('saved', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
