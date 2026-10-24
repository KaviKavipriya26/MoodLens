import React, { useState } from 'react';
import { AnalysisResult, Language } from '../types';
import { t } from '../locales/i18n';
import { ResultCard } from '../components/ResultCard';
import { EP, apiCall, mockAnalyze } from '../services/api';

interface AnalyzePageProps {
  lang: Language;
  onNewResult: (result: AnalysisResult) => void;
  onToast: (msg: string) => void;
  onSaveToJournal: (entry: { m: number; d: string; n: string }) => void;
  onDownloadReport: (name: string) => void;
}

export const AnalyzePage: React.FC<AnalyzePageProps> = ({
  lang,
  onNewResult,
  onToast,
  onSaveToJournal,
  onDownloadReport,
}) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onToast(t('bad', lang));
      return;
    }

    setLoading(true);
    setCurrentResult(null);

    try {
      const res = await apiCall<AnalysisResult>(
        EP.analyze,
        { text: trimmed },
        'POST'
      );
      setCurrentResult(res);
      onNewResult(res);
    } catch {
      // Fallback to local mock analyzer when backend is offline
      const mockRes = mockAnalyze(trimmed);
      setCurrentResult(mockRes);
      onNewResult(mockRes);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setText('');
    setCurrentResult(null);
  };

  return (
    <div>
      <h2>{t('analyze', lang)}</h2>

      <div className="card">
        <textarea
          id="tx"
          rows={5}
          maxLength={500}
          placeholder={t('ph', lang)}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            marginTop: '8px',
          }}
        >
          <span className="mu" id="cc">
            {text.length}/500
          </span>
          <span style={{ flex: 1 }}></span>
          <button
            type="button"
            className="btn g"
            onClick={handleClear}
          >
            {t('clear', lang)}
          </button>
          <button
            type="button"
            className="btn"
            disabled={loading}
            onClick={handleAnalyze}
          >
            {loading ? t('proc', lang) : t('run', lang)}
          </button>
        </div>
      </div>

      <div id="rs">
        {loading && <div className="spin"></div>}
        {currentResult && !loading && (
          <ResultCard
            result={currentResult}
            id="current"
            lang={lang}
            onSaveToJournal={onSaveToJournal}
            onDownloadReport={onDownloadReport}
          />
        )}
      </div>
    </div>
  );
};
