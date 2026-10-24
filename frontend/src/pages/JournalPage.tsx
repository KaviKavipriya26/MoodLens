import React, { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js';
import { Language, MoodEntry } from '../types';
import { t } from '../locales/i18n';
import { EP, apiCall, mockAnalyze } from '../services/api';

interface JournalPageProps {
  entries: MoodEntry[];
  lang: Language;
  onToast: (msg: string) => void;
  onEntriesChange: (entries: MoodEntry[]) => void;
}

const moodEmojis = ['', '😞', '😕', '😐', '🙂', '😊'];
const moodColors = ['', '#e5677a', '#e9a23b', '#cbd5e1', '#7ccfc3', '#2a9d8f'];

export const JournalPage: React.FC<JournalPageProps> = ({
  entries,
  lang,
  onToast,
  onEntriesChange,
}) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedMood, setSelectedMood] = useState<number>(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    let chart: Chart | null = null;
    if (chartRef.current && entries.length > 0) {
      chart = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: entries.map((j) => j.d).reverse(),
          datasets: [
            {
              label: t('journal', lang),
              data: entries.map((j) => j.m).reverse(),
              borderColor: '#2a9d8f',
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { min: 1, max: 5 },
          },
        },
      });
    }

    return () => {
      if (chart) chart.destroy();
    };
  }, [entries, lang]);

  const handleSaveEntry = async () => {
    if (!selectedMood) {
      onToast(t('bad', lang));
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const newEntry: MoodEntry = {
      m: selectedMood,
      d: today,
      n: note,
    };

    try {
      await apiCall(EP.mood, {
        mood: selectedMood,
        date: today,
        note,
      });
    } catch {
      // Offline fallback
    }

    onEntriesChange([newEntry, ...entries]);
    onToast(t('saved', lang));
    setNote('');
    setSelectedMood(0);
  };

  const handleAnalyzeNote = () => {
    if (!note.trim()) return;
    const res = mockAnalyze(note);
    onToast(`${res.label} (${res.conf}%)`);
  };

  const handleEdit = (idx: number) => {
    const current = entries[idx].n || '';
    const updated = window.prompt(t('edit', lang), current);
    if (updated !== null) {
      const copy = [...entries];
      copy[idx] = { ...copy[idx], n: updated };
      onEntriesChange(copy);
    }
  };

  const handleDelete = async (idx: number) => {
    const entry = entries[idx];
    if (entry.id) {
      try {
        await apiCall(`${EP.mood}?id=${entry.id}`, null, 'DELETE');
      } catch {
        // Offline
      }
    }
    const copy = [...entries];
    copy.splice(idx, 1);
    onEntriesChange(copy);
  };

  return (
    <div>
      <h2>{t('journal', lang)}</h2>

      <div className="grid g2">
        <div className="card">
          <h3>{t('mood', lang)}</h3>
          <div style={{ display: 'flex', gap: '4px', margin: '8px 0' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                className={`mood ${selectedMood === i ? 'on' : ''}`}
                onClick={() => setSelectedMood(i)}
              >
                {moodEmojis[i]}
              </button>
            ))}
          </div>

          <textarea
            id="jn"
            rows={2}
            placeholder={t('note', lang)}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ margin: '8px 0' }}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn"
              onClick={handleSaveEntry}
            >
              {t('add', lang)}
            </button>
            <button
              type="button"
              className="btn g"
              onClick={handleAnalyzeNote}
            >
              {t('analyze', lang)}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="cal">
            {Array.from({ length: 31 }, (_, i) => {
              const dayStr = `2026-10-${String(i + 1).padStart(2, '0')}`;
              const found = entries.find((j) => j.d === dayStr);
              return (
                <i
                  key={i}
                  style={
                    found
                      ? { backgroundColor: moodColors[found.m], color: '#fff' }
                      : undefined
                  }
                  title={found ? moodEmojis[found.m] : undefined}
                >
                  {i + 1}
                </i>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div style={{ height: '140px', width: '100%' }}>
          <canvas ref={chartRef}></canvas>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        {entries.length > 0 ? (
          entries.map((j, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '10px',
                padding: '8px 0',
                borderBottom: '1px solid var(--bd)',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '20px' }}>{moodEmojis[j.m]}</span>
              <span className="mu">{j.d}</span>
              <span style={{ flex: 1 }}>{j.n}</span>
              <button
                type="button"
                className="btn g"
                style={{ padding: '4px 10px', fontSize: '13px' }}
                onClick={() => handleEdit(i)}
              >
                {t('edit', lang)}
              </button>
              <button
                type="button"
                className="btn g"
                style={{ padding: '4px 10px', fontSize: '13px' }}
                onClick={() => handleDelete(i)}
              >
                {t('del', lang)}
              </button>
            </div>
          ))
        ) : (
          <span className="mu">{t('none', lang)}</span>
        )}
      </div>
    </div>
  );
};
