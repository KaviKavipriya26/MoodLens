import React, { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js';
import { AnalysisResult, Language, ReportSummary, Summary } from '../types';
import { t } from '../locales/i18n';
import { Column, Table } from '../components/Table';
import { CombinedChart } from '../components/CombinedChart';
import { ModelMetricsCard } from '../components/ModelMetrics';
import { EP, addDays, apiCall, todayStr } from '../services/api';

interface ReportsPageProps {
  history: AnalysisResult[];
  lang: Language;
  summary: Summary | null;
  onToast: (msg: string) => void;
  onDownloadReport: (name: string, range?: { from?: string; to?: string }) => void;
  onViewResult: (result: AnalysisResult) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  history,
  lang,
  summary,
  onToast,
  onDownloadReport,
  onViewResult,
}) => {
  const [fromDate, setFromDate] = useState(addDays(-29));
  const [toDate, setToDate] = useState(todayStr());
  const [rangeSummary, setRangeSummary] = useState<ReportSummary | null>(null);

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
      const res = await apiCall<ReportSummary>(EP.report, { from: fromDate, to: toDate }, 'POST', onToast);
      setRangeSummary(res);
    } catch {
      // error toast already shown by apiCall
    }
  };

  const range = { from: fromDate, to: toDate };

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

  const rs = rangeSummary;
  const stats: [string, string | number][] = rs
    ? [
        [t('total', lang), rs.total],
        [t('dep', lang), rs.depressed],
        [t('non', lang), rs.non_depressed],
        [t('risk', lang), rs.avg_risk !== null ? `${rs.avg_risk}%` : '–'],
        [t('moodEntries', lang), rs.mood_entries],
        [t('avgMood', lang), rs.avg_mood !== null ? `${rs.avg_mood}/5` : '–'],
      ]
    : [];

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

        <p style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={handleGenerate}>
            {t('gen', lang)}
          </button>
          <button type="button" className="btn g" onClick={() => onDownloadReport('report.csv', range)}>
            {t('csv', lang)}
          </button>
          <button type="button" className="btn g" onClick={() => onDownloadReport('report.pdf', range)}>
            {t('pdf', lang)}
          </button>
        </p>

        {rs && (
          <div className="grid" style={{ marginTop: '12px' }}>
            {stats.map(([label, val], idx) => (
              <div key={idx} className="card">
                <div className="mu">{label}</div>
                <div className="stat">{val}</div>
              </div>
            ))}
          </div>
        )}
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

      <CombinedChart series={summary?.series ?? []} lang={lang} />

      <ModelMetricsCard lang={lang} />

      <div className="card" style={{ marginTop: '16px' }}>
        <Table rows={history} columns={hcols} lang={lang} onRowClick={(r) => onViewResult(r)} />
      </div>
    </div>
  );
};
