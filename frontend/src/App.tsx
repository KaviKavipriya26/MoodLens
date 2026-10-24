import React, { useEffect, useState } from 'react';
import { AnalysisResult, Language, MoodEntry, Page, Theme, User } from './types';
import { t } from './locales/i18n';
import { EP, apiCall, initialHistory, initialJournal, ls } from './services/api';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Modal } from './components/Modal';
import { ToastContainer, ToastMessage } from './components/Toast';

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
  const [history, setHistory] = useState<AnalysisResult[]>(initialHistory);
  const [journal, setJournal] = useState<MoodEntry[]>(initialJournal);
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

  // Add toast helper
  const addToast = (msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text: msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((tItem) => tItem.id !== id));
    }, 2600);
  };

  // Load user data from Django if token exists
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const histData = await apiCall<AnalysisResult[]>(EP.history, null, 'GET');
        if (Array.isArray(histData) && histData.length > 0) {
          setHistory(histData);
        }
      } catch {
        // Fallback to local default
      }

      try {
        const moodData = await apiCall<any[]>(EP.mood, null, 'GET');
        if (Array.isArray(moodData) && moodData.length > 0) {
          setJournal(
            moodData.map((x) => ({
              id: x.id,
              m: x.mood,
              d: x.date,
              n: x.note,
            }))
          );
        }
      } catch {
        // Fallback
      }
    };

    loadUserData();
  }, [user]);

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

  const handleDownloadFile = (filename: string) => {
    // Generate CSV or PDF download
    if (filename.endsWith('.csv')) {
      const csvHeader = 'date,text,label,confidence,severity,polarity\n';
      const csvRows = history
        .map(
          (h) =>
            `"${h.date}","${h.text.replace(/"/g, '""')}","${h.label}",${h.conf},"${h.sev}",${h.pol}`
        )
        .join('\n');
      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Simulating PDF print/download
      window.print();
    }
    addToast(`${t('saved', lang)}: ${filename}`);
  };

  const handleSaveToJournal = (entry: { m: number; d: string; n: string }) => {
    setJournal((prev) => [entry, ...prev]);
    addToast(t('saved', lang));
  };

  // Determine active view
  const isProtectedView = PROT.includes(page) && user !== null;

  const renderContent = () => {
    switch (page) {
      case 'home':
        return (
          <HomePage
            user={user}
            lang={lang}
            onNavigate={handleNavigate}
          />
        );
      case 'login':
        return (
          <LoginPage
            lang={lang}
            onLoginSuccess={handleLoginSuccess}
            onToast={addToast}
          />
        );
      case 'dash':
        return (
          <DashboardPage
            history={history}
            lang={lang}
            onViewResult={(res) => setModalResult(res)}
          />
        );
      case 'analyze':
        return (
          <AnalyzePage
            lang={lang}
            onNewResult={(res) => setHistory((prev) => [res, ...prev])}
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
          />
        );
      case 'journal':
        return (
          <JournalPage
            entries={journal}
            lang={lang}
            onToast={addToast}
            onEntriesChange={(newEntries) => setJournal(newEntries)}
          />
        );
      case 'history':
        return (
          <HistoryPage
            history={history}
            lang={lang}
            onHistoryChange={(newHist) => setHistory(newHist)}
            onViewResult={(res) => setModalResult(res)}
            onDownloadReport={handleDownloadFile}
          />
        );
      case 'reports':
        return (
          <ReportsPage
            history={history}
            lang={lang}
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
            onToast={addToast}
            onToggleTheme={handleToggleTheme}
            onToggleLang={handleToggleLang}
            onUpdateUser={(updated) => {
              setUser(updated);
              ls.set('ms_user', JSON.stringify(updated));
            }}
          />
        );
      case 'about':
        return <AboutPage lang={lang} />;
      default:
        return (
          <HomePage
            user={user}
            lang={lang}
            onNavigate={handleNavigate}
          />
        );
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
                <a
                  key={p}
                  className={p === page ? 'on' : ''}
                  onClick={() => handleNavigate(p)}
                >
                  {t(p, lang)}
                </a>
              ))}
            </aside>
            <main className="main" id="mn">
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
