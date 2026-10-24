import React, { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js';
import { AnalysisResult, Language } from '../types';
import { t } from '../locales/i18n';
import { Column, Table } from '../components/Table';
import { EP, apiCall } from '../services/api';

interface ReportsPageProps {
  history: AnalysisResult[];
  lang: Language;
  onToast: (msg: string) => void;
  onDownloadReport: (name: string) => void;
  onViewResult: (result: AnalysisResult) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  history,
  lang,
  onToast,
  onDownloadReport,
  onViewResult,
}) => {
  const [fromDate, setFromDate] = useState('2026-10-01');
  const [toDate, setToDate] = useState('2026-10-23');

  const c1Ref = useRef<HTMLCanvasElement | null>(null);
  const c2Ref = useRef<HTMLCanvasElement | null>(null);

  const depCount = history.filter((r) => r.label === 'Depressed').length;
  const nonDepCount = history.length - depCount;

  useEffect(() => {
    let c1Chart: Chart | null = null;
    let c2Chart: Chart | null = null;

    if (c1Ref.current && history.length > 0) {
      c1Chart = new Chart(c1Ref.current, {
        type: 'line',
        data: {
          labels: history.map((r) => r.date).reverse(),
          datasets: [
            {
              data: history.map((r) => r.pol).reverse(),
              borderColor: '#8b7fd6',
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });
    }

    if (c2Ref.current) {
      c2Chart = new Chart(c2Ref.current, {
        type: 'doughnut',
        data: {
          labels: [t('dep', lang), t('non', lang)],
          datasets: [
            {
              data: [depCount, nonDepCount],
              backgroundColor: ['#e5677a', '#2a9d8f'],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }

    return () => {
      if (c1Chart) c1Chart.destroy();
      if (c2Chart) c2Chart.destroy();
    };
  }, [history, lang, depCount, nonDepCount]);

  const handleGenerate = async () => {
    try {
      await apiCall(EP.report, {}, 'POST');
      onToast(t('saved', lang));
    } catch {
      onToast(t('saved', lang));
    }
  };

  const hcols: Column<AnalysisResult>[] = [
    {
      key: 'text',
      label: t('text', lang),
      render: (r) => (
        <span style={{ cursor: 'pointer' }}>
          {r.text.length > 48 ? r.text.slice(0, 48) + '…' : r.text}
        </span>
      ),
    },
    {
      key: 'label',
      label: t('result', lang),
      render: (r) => (
        <span className={`pill ${r.label === 'Depressed' ? 'd' : 'n'}`}>
          {r.label === 'Depressed' ? t('dep', lang) : t('non', lang)}
        </span>
      ),
    },
    {
      key: 'sev',
      label: t('sev', lang),
      render: (r) => <span className={`pill ${r.sev}`}>{r.sev}</span>,
    },
    {
      key: 'date',
      label: t('date', lang),
    },
  ];

  return (
    <div>
      <h2>{t('reports', lang)}</h2>

      <div className="card">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: '140px' }}>
            {t('from', lang)}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ marginTop: '4px' }}
            />
          </label>
          <label style={{ flex: 1, minWidth: '140px' }}>
            {t('to', lang)}
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ marginTop: '4px' }}
            />
          </label>
        </div>

        <p style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn"
            onClick={handleGenerate}
          >
            {t('gen', lang)}
          </button>
          <button
            type="button"
            className="btn g"
            onClick={() => onDownloadReport('report.csv')}
          >
            {t('csv', lang)}
          </button>
          <button
            type="button"
            className="btn g"
            onClick={() => onDownloadReport('report.pdf')}
          >
            {t('pdf', lang)}
          </button>
        </p>
      </div>

      <div className="grid g2" style={{ marginTop: '16px' }}>
        <div className="card">
          <div style={{ height: '200px', width: '100%' }}>
            <canvas ref={c1Ref}></canvas>
          </div>
        </div>
        <div className="card">
          <div style={{ height: '200px', width: '100%' }}>
            <canvas ref={c2Ref}></canvas>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <Table
          rows={history}
          columns={hcols}
          lang={lang}
          onRowClick={(r) => onViewResult(r)}
        />
      </div>
    </div>
  );
};
