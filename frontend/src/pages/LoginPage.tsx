import React, { useState } from 'react';
import { Language, User } from '../types';
import { t } from '../locales/i18n';
import { EP, apiCall, ls } from '../services/api';

interface LoginPageProps {
  lang: Language;
  onLoginSuccess: (user: User) => void;
  onToast: (msg: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  lang,
  onLoginSuccess,
  onToast,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const errList: string[] = [];
    const trimmedEmail = email.trim();

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      errList.push('✗ ' + t('email', lang));
    }
    if (password.length < 6) {
      errList.push('✗ ' + t('pw', lang) + ' (6+)');
    }
    if (isRegister && !name.trim()) {
      errList.push('✗ ' + t('name', lang));
    }

    setErrors(errList);
    if (errList.length > 0) return;

    setLoading(true);
    try {
      const endpoint = isRegister ? EP.register : EP.login;
      const payload: any = { email: trimmedEmail, password };
      if (isRegister) payload.name = name.trim();

      const res = await apiCall<{ token: string; user: User }>(
        endpoint,
        payload,
        'POST',
        onToast
      );

      ls.set('ms_token', res.token);
      onLoginSuccess(res.user);
      onToast('👋 ' + res.user.name);
    } catch {
      // Offline fallback for testing if backend is not started
      const fallbackUser: User = {
        name: isRegister && name.trim() ? name.trim() : trimmedEmail.split('@')[0],
        email: trimmedEmail,
      };
      ls.set('ms_token', 'mock_token_' + Date.now());
      onLoginSuccess(fallbackUser);
      onToast('👋 ' + fallbackUser.name + ' (Local session)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrap" style={{ maxWidth: '420px', margin: 'auto' }}>
      <div className="card">
        <h2>{t(isRegister ? 'register' : 'login', lang)}</h2>

        {errors.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            {errors.map((err, idx) => (
              <div key={idx} className="err" role="alert">
                {err}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isRegister && (
            <label>
              {t('name', lang)}
              <input
                id="nm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                style={{ marginTop: '4px' }}
              />
            </label>
          )}

          <label>
            {t('email', lang)}
            <input
              id="em"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={{ marginTop: '4px' }}
            />
          </label>

          <label>
            {t('pw', lang)}
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <input
                id="pw"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
              <button
                type="button"
                className="btn g"
                style={{ flexShrink: 0 }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? t('hide', lang) : t('show', lang)}
              </button>
            </div>
          </label>

          <p style={{ marginTop: '8px' }}>
            <button
              type="submit"
              className="btn"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? t('proc', lang) : t(isRegister ? 'register' : 'login', lang)}
            </button>
          </p>

          <a
            className="mu"
            style={{ cursor: 'pointer', textAlign: 'center', marginTop: '6px' }}
            onClick={() => {
              setIsRegister(!isRegister);
              setErrors([]);
            }}
          >
            {t(isRegister ? 'login' : 'register', lang)}
          </a>
        </form>
      </div>
    </div>
  );
};
