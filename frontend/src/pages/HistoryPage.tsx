import React, { useState } from 'react';
import { AnalysisResult, Language } from '../types';
import { t } from '../locales/i18n';
import { EP, apiCall } from '../services/api';

interface HistoryPageProps {
  history: AnalysisResult[];
  lang: Language;
  onHistoryChange: (history: AnalysisResult[]) => void;
  onViewResult: (result: AnalysisResult) => void;
  onDownloadReport: (name: string) => void;
  onToast: (msg: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  lang,
  onHistoryChange,
  onViewResult,
  onDownloadReport,
  onToast,
}) => {
  const [query, setQuery] = useState('');
  const [filterLabel, setFilterLabel] = useState<string>('');
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<number>(-1);
  const [page, setPage] = useState<number>(0);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(-sortDir);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const filtered = history
    .filter((r) => {
      const matchQuery = r.text.toLowerCase().includes(query.toLowerCase());
      const matchFilter = !filterLabel || r.label === filterLabel;
      return matchQuery && matchFilter;
    })
    .sort((a, b) => {
      // @ts-expect-error dynamic key access
      const aVal = a[sortKey];
      // @ts-expect-error dynamic key access
      const bVal = b[sortKey];
      if (aVal > bVal) return 1 * sortDir;
      if (aVal < bVal) return -1 * sortDir;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / 5));
  const pageRows = filtered.slice(page * 5, page * 5 + 5);

  const handleDelete = async (item: AnalysisResult) => {
    if (item.id) {
      try {
        await apiCall(`${EP.history}?id=${item.id}`, null, 'DELETE', onToast);
      } catch {
        return; // keep the row if the server could not delete it
      }
    }
    const idx = history.indexOf(item);
    if (idx !== -1) {
      const copy = [...history];
      copy.splice(idx, 1);
      onHistoryChange(copy);
    }
  };

  return (
    <div>
      <h2>{t('history', lang)}</h2>

      <div className="card">
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '10px',
            flexWrap: 'wrap',
          }}
        >
          <input
            style={{ flex: 2, minWidth: '140px' }}
            placeholder={t('search', lang)}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          <select
            style={{ flex: 1, minWidth: '110px' }}
            value={filterLabel}
            onChange={(e) => {
              setFilterLabel(e.target.value);
              setPage(0);
            }}
          >
            <option value="">{t('all', lang)}</option>
            <option value="Depressed">{t('dep', lang)}</option>
            <option value="Non-Depressed">{t('non', lang)}</option>
          </select>
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('text')}>{t('text', lang)}</th>
                <th onClick={() => handleSort('label')}>{t('result', lang)}</th>
                <th onClick={() => handleSort('sev')}>{t('sev', lang)}</th>
                <th onClick={() => handleSort('date')}>{t('date', lang)}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length > 0 ? (
                pageRows.map((r, i) => (
                  <tr key={i}>
                    <td
                      onClick={() => onViewResult(r)}
                      style={{ cursor: 'pointer' }}
                    >
                      {r.text.length > 48 ? r.text.slice(0, 48) + '…' : r.text}
                    </td>
                    <td>
                      <span className={`pill ${r.label === 'Depressed' ? 'd' : 'n'}`}>
                        {r.label === 'Depressed' ? t('dep', lang) : t('non', lang)}
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${r.sev}`}>{r.sev}</span>
                    </td>
                    <td>{r.date}</td>
                    <td>
                      <button
                        type="button"
                        className="btn g"
                        style={{ padding: '4px 10px', fontSize: '13px' }}
                        onClick={() => handleDelete(r)}
                      >
                        {t('del', lang)}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="mu text-center">
                    {t('none', lang)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: '10px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className="btn g"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ‹
          </button>
          <span className="mu">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="btn g"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            ›
          </button>
        </div>

        <p style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn g"
            onClick={() => onDownloadReport('history.csv')}
          >
            {t('csv', lang)}
          </button>
          <button
            type="button"
            className="btn g"
            onClick={() => onDownloadReport('history.pdf')}
          >
            {t('pdf', lang)}
          </button>
        </p>
      </div>
    </div>
  );
};
