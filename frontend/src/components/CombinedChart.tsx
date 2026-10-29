import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { Language, SeriesPoint } from '../types';
import { t } from '../locales/i18n';

Chart.register(...registerables);

interface CombinedChartProps {
  series: SeriesPoint[];
  lang: Language;
}

export const CombinedChart: React.FC<CombinedChartProps> = ({ series, lang }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let chart: Chart | null = null;
    if (ref.current && series.length > 0) {
      chart = new Chart(ref.current, {
        type: 'line',
        data: {
          labels: series.map((s) => s.date),
          datasets: [
            {
              label: t('cMoodL', lang),
              data: series.map((s) => s.mood),
              borderColor: '#2a9d8f',
              backgroundColor: '#2a9d8f',
              yAxisID: 'y',
              tension: 0.3,
              spanGaps: true,
            },
            {
              label: t('cRiskL', lang),
              data: series.map((s) => s.risk),
              borderColor: '#e5677a',
              backgroundColor: '#e5677a',
              yAxisID: 'y1',
              tension: 0.3,
              spanGaps: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { min: 1, max: 5, position: 'left', title: { display: true, text: t('cMoodL', lang) } },
            y1: {
              min: 0,
              max: 100,
              position: 'right',
              grid: { drawOnChartArea: false },
              title: { display: true, text: t('cRiskL', lang) },
            },
          },
        },
      });
    }
    return () => {
      if (chart) chart.destroy();
    };
  }, [series, lang]);

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <h3>{t('cTitle', lang)}</h3>
      {series.length > 0 ? (
        <div style={{ height: '240px', width: '100%' }}>
          <canvas ref={ref}></canvas>
        </div>
      ) : (
        <span className="mu">{t('none', lang)}</span>
      )}
    </div>
  );
};
