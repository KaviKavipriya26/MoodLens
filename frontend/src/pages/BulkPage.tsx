import React, { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js';
import { AnalysisResult, Language } from '../types';
import { t } from '../locales/i18n';
import { Column, Table } from '../components/Table';
import { EP, apiCall } from '../services/api';

interface BulkPageProps {
  lang: Language;
  onToast: (msg: string) => void;
  onViewResult: (result: AnalysisResult) => void;
  onDownloadReport: (name: string) => void;
  onRefresh: () => void;
}

export const BulkPage: React.FC<BulkPageProps> = ({
  lang,
  onToast,
  onViewResult,
  onDownloadReport,
  onRefresh,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pieRef = useRef<HTMLCanvasElement | null>(null);

  const [previewRows, setPreviewRows] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [bulkResults, setBulkResults] = useState<AnalysisResult[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file || !/\.csv$/i.test(file.name)) {
      onToast(t('badf', lang));
      return;
    }

    try {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => line.split(',')[0].replace(/"/g, '').trim())
        .filter(Boolean)
        .slice(1);

      if (rows.length === 0) {
        onToast(t('bad', lang));
        return;
      }

      setPreviewRows(rows.slice(0, 3));
      setProgress(10);

      for (let i = 2; i <= 10; i++) {
        await new Promise((r) => setTimeout(r, 100));
        setProgress(i * 10);
      }

      try {
        const res = await apiCall<AnalysisResult[]>(
          EP.bulk,
          { texts: rows },
          'POST',
          onToast
        );
        setBulkResults(res);
        onRefresh();
      } catch {
        // error toast already shown by apiCall
      }
      setProgress(null);
    } catch {
      onToast(t('bad', lang));
      setProgress(null);
    }
  };

  const filteredResults = (bulkResults || []).filter((r) =>
    r.text.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const depCount = (bulkResults || []).filter((r) => r.label === 'Depressed').length;
  const nonDepCount = (bulkResults || []).length - depCount;

  useEffect(() => {
    let pieChart: Chart | null = null;
    if (pieRef.current && bulkResults && bulkResults.length > 0) {
      pieChart = new Chart(pieRef.current, {
        type: 'pie',
        data: {
          labels: [t('dep', lang), t('non', lang)],
          datasets: [
            {
              data: [depCount, nonDepCount],
              backgroundColor: ['#e5677a', '#2a9d8f'],
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
      if (pieChart) pieChart.destroy();
    };
  }, [bulkResults, depCount, nonDepCount, lang]);

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
      <h2>{t('bulk', lang)}</h2>

      <div className="card">
        <div
          className="drop"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
        >
          📄 {t('drop', lang)}
          <input
            ref={fileInputRef}
            id="f"
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
        </div>

        {previewRows.length > 0 && progress !== null && (
          <div style={{ marginTop: '16px' }}>
            <h3>{t('prev', lang)}</h3>
            {previewRows.map((r, i) => (
              <div key={i} className="mu">
                • {r.slice(0, 80)}
              </div>
            ))}
            <p style={{ marginTop: '8px' }}>{t('proc', lang)}</p>
            <progress
              id="pr"
              max={100}
              value={progress}
              style={{ width: '100%' }}
            ></progress>
          </div>
        )}

        {bulkResults && (
          <div style={{ marginTop: '16px' }}>
            <div className="grid" style={{ margin: '12px 0' }}>
              <div className="card">
                <div className="mu">{t('total', lang)}</div>
                <div className="stat">{bulkResults.length}</div>
              </div>
              <div className="card">
                <div className="mu">{t('dep', lang)}</div>
                <div className="stat">{depCount}</div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ height: '90px', width: '90px' }}>
                  <canvas ref={pieRef}></canvas>
                </div>
              </div>
            </div>

            <input
              placeholder={t('search', lang)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: '10px' }}
            />

            <Table
              rows={filteredResults.slice(0, 8)}
              columns={hcols}
              lang={lang}
              onRowClick={(r) => onViewResult(r)}
            />

            <p style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn g"
                onClick={() => onDownloadReport('bulk.csv')}
              >
                {t('csv', lang)}
              </button>
              <button
                type="button"
                className="btn g"
                onClick={() => onDownloadReport('bulk.pdf')}
              >
                {t('pdf', lang)}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
