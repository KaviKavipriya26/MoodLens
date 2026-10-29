import React, { useCallback, useEffect, useState } from 'react';
import { AnalysisResult, Language, MoodEntry, Page, ReminderConfig, Summary, Theme, User } from './types';
import { t } from './locales/i18n';
import { EP, UNAUTH_EVENT, apiCall, downloadFile, ls, mapMoods } from './services/api';
import { getReminder, markReminderSent, notify, reminderDue, saveReminder } from './services/reminder';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Modal } from './components/Modal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { TrendBanner } from './components/TrendBanner';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { BulkPage } from './pages/BulkPage';
import { JournalPage } from './pages/JournalPage';
import { HistoryPage } from './pages/HistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';

const PROT: Page[] = ['dash', 'analyze', 'bulk', 'journal', 'history', 'reports', 'settings'];

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => (ls.get('ms_lang') as Language) || 'en');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = ls.get('ms_theme') as Theme | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [user, setUser] = useState<User | null>(() => {
    const token = ls.get('ms_token');
    const savedUser = ls.get('ms_user');
    if (token && savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return { name: 'User', email: 'user@example.com' };
      }
    }
    return null;
  });

  const [page, setPage] = useState<Page>('home');
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [journal, setJournal] = useState<MoodEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reminder, setReminder] = useState<ReminderConfig>(getReminder);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [modalResult, setModalResult] = useState<AnalysisResult | null>(null);

  // Sync theme with document
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    ls.set('ms_theme', theme);
  }, [theme]);

  // Sync language with document
  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang === 'ta') {
      document.body.classList.add('ta');
    } else {
      document.body.classList.remove('ta');
    }
    ls.set('ms_lang', lang);
  }, [lang]);

  const addToast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text: msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((tItem) => tItem.id !== id));
    }, 2600);
  }, []);

  const refreshSummary = useCallback(async () => {
    try {
      setSummary(await apiCall<Summary>(EP.summary, null, 'GET'));
    } catch {
      // ignore: summary is optional
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const h = await apiCall<AnalysisResult[]>(EP.history, null, 'GET', addToast);
      setHistory(Array.isArray(h) ? h : []);
    } catch {
      // toast already shown
    }
    try {
      setJournal(mapMoods(await apiCall<any[]>(EP.mood, null, 'GET')));
    } catch {
      // ignore
    }
    refreshSummary();
  }, [addToast, refreshSummary]);

  // Load this user's data from MongoDB (via Django) after login; clear it on logout
  useEffect(() => {
    if (user) {
      loadAll();
    } else {
      setHistory([]);
      setJournal([]);
      setSummary(null);
    }
  }, [user, loadAll]);

  // Expired / invalid token -> back to login
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setPage('login');
      addToast(t('sessionExp', lang));
    };
    window.addEventListener(UNAUTH_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTH_EVENT, onUnauthorized);
  }, [lang, addToast]);

  // Daily mood reminder (runs while the app is open in the browser)
  useEffect(() => {
    if (!user || !summary) return;
    const tick = () => {
      if (reminderDue(reminder, summary.logged_today)) {
        markReminderSent();
        notify('MindScan', t('remBody', lang));
        addToast('🔔 ' + t('remBody', lang));
      }
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [user, summary, reminder, lang, addToast]);

  const handleReminderChange = (cfg: ReminderConfig) => {
    setReminder(cfg);
    saveReminder(cfg);
  };

  const handleNavigate = (targetPage: Page) => {
    if (PROT.includes(targetPage) && !user) {
      setPage('login');
    } else {
      setPage(targetPage);
    }
    window.scrollTo(0, 0);
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'ta' : 'en'));
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    ls.set('ms_user', JSON.stringify(loggedInUser));
    setPage('dash');
  };

  const handleLogout = () => {
    setUser(null);
    ls.remove('ms_token');
    ls.remove('ms_user');
    setPage('home');
  };

  // CSV / PDF are generated by the backend from the data stored in MongoDB
  const handleDownloadFile = async (filename: string, range?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams({ fmt: filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'csv' });
    if (range?.from) qs.set('from', range.from);
    if (range?.to) qs.set('to', range.to);
    try {
      await downloadFile(`${EP.report}?${qs.toString()}`, filename);
      addToast(`${t('saved', lang)}: ${filename}`);
    } catch (e) {
      addToast((e as Error).message);
    }
  };

  const handleSaveToJournal = async (entry: { m: number; d: string; n: string }) => {
    try {
      const list = await apiCall<any[]>(EP.mood, { mood: entry.m, date: entry.d, note: entry.n }, 'POST', addToast);
      setJournal(mapMoods(list));
      addToast(t('saved', lang));
      refreshSummary();
    } catch {
      // toast already shown
    }
  };

  // Determine active view
  const isProtectedView = PROT.includes(page) && user !== null;

  const renderContent = () => {
    switch (page) {
      case 'home':
        return <HomePage user={user} lang={lang} onNavigate={handleNavigate} />;
      case 'login':
        return <LoginPage lang={lang} onLoginSuccess={handleLoginSuccess} onToast={addToast} />;
      case 'dash':
        return (
          <DashboardPage
            history={history}
            lang={lang}
            summary={summary}
            onViewResult={(res) => setModalResult(res)}
          />
        );
      case 'analyze':
        return (
          <AnalyzePage
            lang={lang}
            onNewResult={(res) => {
              setHistory((prev) => [res, ...prev]);
              refreshSummary();
            }}
            onToast={addToast}
            onSaveToJournal={handleSaveToJournal}
            onDownloadReport={handleDownloadFile}
          />
        );
      case 'bulk':
        return (
          <BulkPage
            lang={lang}
            onToast={addToast}
            onViewResult={(res) => setModalResult(res)}
            onDownloadReport={handleDownloadFile}
            onRefresh={loadAll}
          />
        );
      case 'journal':
        return (
          <JournalPage
            entries={journal}
            lang={lang}
            summary={summary}
            onToast={addToast}
            onEntriesChange={(newEntries) => setJournal(newEntries)}
            onSummaryRefresh={refreshSummary}
          />
        );
      case 'history':
        return (
          <HistoryPage
            history={history}
            lang={lang}
            onHistoryChange={(newHist) => {
              setHistory(newHist);
              refreshSummary();
            }}
            onViewResult={(res) => setModalResult(res)}
            onDownloadReport={handleDownloadFile}
            onToast={addToast}
          />
        );
      case 'reports':
        return (
          <ReportsPage
            history={history}
            lang={lang}
            summary={summary}
            onToast={addToast}
            onDownloadReport={handleDownloadFile}
            onViewResult={(res) => setModalResult(res)}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            user={user}
            lang={lang}
            reminder={reminder}
            onToast={addToast}
            onToggleTheme={handleToggleTheme}
            onToggleLang={handleToggleLang}
            onUpdateUser={(updated) => {
              setUser(updated);
              ls.set('ms_user', JSON.stringify(updated));
            }}
            onReminderChange={handleReminderChange}
            onLogout={handleLogout}
          />
        );
      case 'about':
        return <AboutPage lang={lang} />;
      default:
        return <HomePage user={user} lang={lang} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        user={user}
        lang={lang}
        onNavigate={handleNavigate}
        onToggleTheme={handleToggleTheme}
        onToggleLang={handleToggleLang}
        onLogout={handleLogout}
      />

      <div style={{ flex: 1 }}>
        {isProtectedView ? (
          <div className="app">
            <aside className="side">
              {PROT.map((p) => (
                <a key={p} className={p === page ? 'on' : ''} onClick={() => handleNavigate(p)}>
                  {t(p, lang)}
                </a>
              ))}
            </aside>
            <main className="main" id="mn">
              <TrendBanner summary={summary} lang={lang} />
              {renderContent()}
            </main>
          </div>
        ) : (
          renderContent()
        )}
      </div>

      <Footer lang={lang} />

      <ToastContainer messages={toasts} />

      {modalResult && (
        <Modal
          result={modalResult}
          lang={lang}
          onClose={() => setModalResult(null)}
          onSaveToJournal={handleSaveToJournal}
          onDownloadReport={handleDownloadFile}
        />
      )}
    </div>
  );
};

export default App;
