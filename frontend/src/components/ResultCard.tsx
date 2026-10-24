import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { AnalysisResult, Language } from '../types';
import { t } from '../locales/i18n';
import { Gauge } from './Gauge';
import { Highlighted } from './Highlighted';

Chart.register(...registerables);

interface ResultCardProps {
  result: AnalysisResult;
  id?: string;
  lang: Language;
  onSaveToJournal?: (entry: { m: number; d: string; n: string }) => void;
  onDownloadReport?: (name: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  lang,
  onSaveToJournal,
  onDownloadReport,
}) => {
  const dep = result.label === 'Depressed';
  const xwCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const emCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let xwChart: Chart | null = null;
    let emChart: Chart | null = null;

    if (xwCanvasRef.current && result.words.length > 0) {
      xwChart = new Chart(xwCanvasRef.current, {
        type: 'bar',
        data: {
          labels: result.words.map((w) => w.w),
          datasets: [
            {
              data: result.words.map((w) => w.v),
              backgroundColor: result.words.map((w) =>
                w.v > 0 ? '#e5677a' : '#2a9d8f'
              ),
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });
    }

    if (emCanvasRef.current && result.emo) {
      emChart = new Chart(emCanvasRef.current, {
        type: 'bar',
        data: {
          labels: Object.keys(result.emo),
          datasets: [
            {
              data: Object.values(result.emo),
              backgroundColor: [
                '#8b7fd6',
                '#e5677a',
                '#e9a23b',
                '#2a9d8f',
                '#94a3b8',
              ],
              borderRadius: 6,
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

    return () => {
      if (xwChart) xwChart.destroy();
      if (emChart) emChart.destroy();
    };
  }, [result]);

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Gauge value={result.conf} color={dep ? 'var(--bad)' : 'var(--ok)'} />
        <div>
          <span className={`pill ${dep ? 'd' : 'n'}`}>
            {dep ? t('dep', lang) : t('non', lang)}
          </span>{' '}
          <span className={`pill ${result.sev}`}>{result.sev}</span>
          <div className="mu" style={{ marginTop: '4px' }}>
            {t('conf', lang)}: {result.conf}%
          </div>
        </div>
      </div>

      {(dep || result.sev === 'High') && (
        <p className="card" style={{ background: '#8b7fd61f', marginTop: '12px' }}>
          💜 {t('support', lang)}
        </p>
      )}

      <div className="grid g2" style={{ marginTop: '12px' }}>
        <div>
          <h3>{t('emo', lang)}</h3>
          {result.emojis && result.emojis.length > 0 ? (
            result.emojis.map((e, idx) => (
              <div key={idx}>
                {e.e} {e.m} <span className="mu">({e.s})</span>
              </div>
            ))
          ) : (
            <span className="mu">{t('none', lang)}</span>
          )}

          <h3 style={{ marginTop: '12px' }}>{t('slang', lang)}</h3>
          {result.slang && result.slang.length > 0 ? (
            result.slang.map((s, idx) => (
              <div key={idx}>
                <mark className="sl">{s.k}</mark> → {s.m}
              </div>
            ))
          ) : (
            <span className="mu">{t('none', lang)}</span>
          )}
        </div>

        <div>
          <h3>
            {t('pol', lang)}: {result.pol}
          </h3>
          <div className="meter" style={{ margin: '14px 0' }}>
            <i style={{ left: `calc(${(result.pol + 1) * 50}% - 3px)` }}></i>
          </div>
          <div className="mu" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>-1</span>
            <span>0</span>
            <span>+1</span>
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: '16px' }}>{t('xai', lang)}</h3>
      <p style={{ margin: '8px 0 12px 0' }}>
        <Highlighted result={result} />
      </p>
      <div style={{ height: '110px', width: '100%', marginBottom: '16px' }}>
        <canvas ref={xwCanvasRef}></canvas>
      </div>

      <h3>{t('emot', lang)}</h3>
      <div style={{ height: '130px', width: '100%', marginBottom: '16px' }}>
        <canvas ref={emCanvasRef}></canvas>
      </div>

      <p style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (onSaveToJournal) {
              onSaveToJournal({
                m: dep ? 2 : 4,
                d: result.date,
                n: result.text.slice(0, 40),
              });
            }
          }}
        >
          {t('save', lang)}
        </button>
        <button
          type="button"
          className="btn g"
          onClick={() => {
            if (onDownloadReport) {
              onDownloadReport('report.pdf');
            }
          }}
        >
          {t('dl', lang)}
        </button>
      </p>
    </div>
  );
};
