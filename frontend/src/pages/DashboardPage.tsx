import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
import { AnalysisResult, Language, Summary } from '../types';
import { t } from '../locales/i18n';
import { Column, Table } from '../components/Table';
import { WeeklySummary } from '../components/WeeklySummary';
import { Suggestions } from '../components/Suggestions';

interface DashboardPageProps {
  history: AnalysisResult[];
  lang: Language;
  summary: Summary | null;
  onViewResult: (result: AnalysisResult) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  history,
  lang,
  summary,
  onViewResult,
}) => {
  const c1Ref = useRef<HTMLCanvasElement | null>(null);
  const c2Ref = useRef<HTMLCanvasElement | null>(null);

  const depCount = history.filter((r) => r.label === 'Depressed').length;
  const nonDepCount = history.length - depCount;
  const avgRisk =
    history.length > 0
      ? Math.round(
          history.reduce(
            (acc, r) => acc + (r.label === 'Depressed' ? r.conf : 100 - r.conf),
            0
          ) / history.length
        )
      : 0;

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
              label: 'Polarity',
              data: history.map((r) => r.pol).reverse(),
              borderColor: '#8b7fd6',
              tension: 0.4,
              fill: true,
              backgroundColor: '#8b7fd622',
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
          cutout: '65%',
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

  const stats = [
    [t('total', lang), history.length],
    [t('dep', lang), depCount],
    [t('non', lang), nonDepCount],
    [t('risk', lang), `${avgRisk}%`],
  ];

  return (
    <div>
      <h2>{t('dash', lang)}</h2>

      <WeeklySummary summary={summary} lang={lang} />

      <div className="grid" style={{ marginTop: '16px' }}>
        {stats.map(([label, val], idx) => (
          <div key={idx} className="card">
            <div className="mu">{label}</div>
            <div className="stat">{val}</div>
          </div>
        ))}
      </div>

      <div className="grid g2" style={{ marginTop: '16px' }}>
        <div className="card">
          <h3>{t('trend', lang)}</h3>
          <div style={{ height: '220px', width: '100%' }}>
            <canvas ref={c1Ref}></canvas>
          </div>
        </div>
        <div className="card">
          <h3>{t('ratio', lang)}</h3>
          <div style={{ height: '220px', width: '100%' }}>
            <canvas ref={c2Ref}></canvas>
          </div>
        </div>
      </div>

      {summary && (
        <div style={{ marginTop: '16px' }}>
          <Suggestions status={summary.status} lang={lang} />
        </div>
      )}

      <div className="card" style={{ marginTop: '16px' }}>
        <h3>{t('recent', lang)}</h3>
        <Table
          rows={history.slice(0, 5)}
          columns={hcols}
          lang={lang}
          onRowClick={(r) => onViewResult(r)}
        />
      </div>
    </div>
  );
};
