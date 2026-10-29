import React, { useState } from 'react';
import { Language, ReminderConfig, User } from '../types';
import { t } from '../locales/i18n';
import { EP, apiCall } from '../services/api';
import { notify } from '../services/reminder';

interface SettingsPageProps {
  user: User | null;
  lang: Language;
  reminder: ReminderConfig;
  onToast: (msg: string) => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onUpdateUser: (user: User) => void;
  onReminderChange: (cfg: ReminderConfig) => void;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  lang,
  reminder,
  onToast,
  onToggleTheme,
  onToggleLang,
  onUpdateUser,
  onReminderChange,
  onLogout,
}) => {
  const [name, setName] = useState(user?.name || '');
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [delPw, setDelPw] = useState('');

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) {
      onToast(t('bad', lang));
      return;
    }
    try {
      const res = await apiCall<User>(EP.profile, { name: name.trim() }, 'POST', onToast);
      onUpdateUser({ ...user, name: res.name });
      onToast(t('saved', lang));
    } catch {
      // error toast already shown by apiCall
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) {
      onToast(t('pw', lang) + ' (6+)');
      return;
    }
    if (newPw !== newPw2) {
      onToast(t('pwdMismatch', lang));
      return;
    }
    try {
      await apiCall(EP.changePassword, { current_password: curPw, new_password: newPw }, 'POST', onToast);
      onToast(t('pwdDone', lang));
      setCurPw('');
      setNewPw('');
      setNewPw2('');
    } catch {
      // error toast already shown by apiCall
    }
  };

  const toggleReminder = async (on: boolean) => {
    if (on && typeof Notification !== 'undefined') {
      let perm = Notification.permission;
      if (perm === 'default') perm = await Notification.requestPermission();
      if (perm === 'denied') onToast(t('remDenied', lang));
    }
    onReminderChange({ ...reminder, enabled: on });
  };

  const handleDelete = async () => {
    if (!delPw) {
      onToast(t('bad', lang));
      return;
    }
    if (!window.confirm(t('delConfirm', lang))) return;
    try {
      await apiCall(EP.deleteAccount, { password: delPw }, 'POST', onToast);
      onLogout();
      onToast(t('delDone', lang));
    } catch {
      // error toast already shown by apiCall
    }
  };

  const col = { display: 'flex', flexDirection: 'column', gap: '12px' } as const;

  return (
    <div>
      <h2>{t('settings', lang)}</h2>

      <div className="card">
        <h3>{t('setProfile', lang)}</h3>
        <form onSubmit={handleSaveName} style={{ ...col, marginTop: '8px' }}>
          <label>
            {t('name', lang)}
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ marginTop: '4px' }} />
          </label>
          <label>
            {t('email', lang)}
            <input value={user?.email || ''} readOnly style={{ marginTop: '4px', opacity: 0.7 }} />
          </label>
          <div>
            <button type="submit" className="btn">
              {t('setSaveName', lang)}
            </button>
          </div>
        </form>

        <p style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '16px 0 0 0' }}>
          <span>
            {t('theme', lang)}:{' '}
            <button type="button" className="btn g" onClick={onToggleTheme} style={{ padding: '6px 12px' }}>
              ◐
            </button>
          </span>
          <span>
            {t('lang', lang)}:{' '}
            <button type="button" className="btn g" onClick={onToggleLang} style={{ padding: '6px 12px' }}>
              {lang === 'en' ? 'தமிழ்' : 'English'}
            </button>
          </span>
        </p>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <h3>{t('pwd', lang)}</h3>
        <form onSubmit={handleChangePassword} style={{ ...col, marginTop: '8px' }}>
          <label>
            {t('pwdCur', lang)}
            <input
              type="password"
              autoComplete="current-password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              style={{ marginTop: '4px' }}
            />
          </label>
          <label>
            {t('pwdNew', lang)}
            <input
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              style={{ marginTop: '4px' }}
            />
          </label>
          <label>
            {t('pwdNew2', lang)}
            <input
              type="password"
              autoComplete="new-password"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              style={{ marginTop: '4px' }}
            />
          </label>
          <div>
            <button type="submit" className="btn">
              {t('pwd', lang)}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <h3>{t('remT', lang)}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', margin: '10px 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={reminder.enabled}
              onChange={(e) => toggleReminder(e.target.checked)}
              style={{ width: 'auto' }}
            />
            {t('remOn', lang)}
          </label>
          <input
            type="time"
            value={reminder.time}
            onChange={(e) => onReminderChange({ ...reminder, time: e.target.value || '20:00' })}
            style={{ width: 'auto' }}
            aria-label={t('remTime', lang)}
          />
          <button
            type="button"
            className="btn g"
            onClick={() => {
              notify('MindScan', t('remBody', lang));
              onToast('🔔 ' + t('remBody', lang));
            }}
          >
            {t('remTest', lang)}
          </button>
        </div>
        <p className="mu">{t('remNote', lang)}</p>
      </div>

      <div className="card danger" style={{ marginTop: '16px' }}>
        <h3>{t('delT', lang)}</h3>
        <p className="mu" style={{ margin: '6px 0 10px 0' }}>
          {t('delP', lang)}
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="password"
            autoComplete="current-password"
            placeholder={t('pw', lang)}
            value={delPw}
            onChange={(e) => setDelPw(e.target.value)}
            style={{ flex: 1, minWidth: '160px' }}
          />
          <button type="button" className="btn dg" onClick={handleDelete}>
            {t('delBtn', lang)}
          </button>
        </div>
      </div>
    </div>
  );
};
