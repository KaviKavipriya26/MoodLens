import React, { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js';
import { AnalysisResult, Language, MoodEntry, Summary } from '../types';
import { t } from '../locales/i18n';
import { EP, apiCall, mapMoods, pad, todayStr } from '../services/api';
import { CrisisCard } from '../components/CrisisCard';

interface JournalPageProps {
  entries: MoodEntry[];
  lang: Language;
  summary: Summary | null;
  onToast: (msg: string) => void;
  onEntriesChange: (entries: MoodEntry[]) => void;
  onSummaryRefresh: () => void;
}

const moodEmojis = ['', '😞', '😕', '😐', '🙂', '😊'];
const moodColors = ['', '#e5677a', '#e9a23b', '#cbd5e1', '#7ccfc3', '#2a9d8f'];

export const JournalPage: React.FC<JournalPageProps> = ({
  entries,
  lang,
  summary,
  onToast,
  onEntriesChange,
  onSummaryRefresh,
}) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedMood, setSelectedMood] = useState<number>(0);
  const [note, setNote] = useState('');
  const [showCrisis, setShowCrisis] = useState(false);
  const [view, setView] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });

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

  // calendar for the visible month (entries are newest first, so the first match per date is the latest)
  const byDate: Record<string, MoodEntry> = {};
  entries.forEach((e) => {
    if (!byDate[e.d]) byDate[e.d] = e;
  });
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstDow = new Date(view.y, view.m, 1).getDay();
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const handleSaveEntry = async () => {
    if (!selectedMood) {
      onToast(t('bad', lang));
      return;
    }
    try {
      const list = await apiCall<any[]>(
        EP.mood,
        { mood: selectedMood, date: todayStr(), note: note.trim() },
        'POST',
        onToast
      );
      const mapped = mapMoods(list);
      onEntriesChange(mapped);
      setShowCrisis(!!mapped[0]?.a?.crisis);
      onToast(t('saved', lang));
      setNote('');
      setSelectedMood(0);
      onSummaryRefresh();
    } catch {
      // error toast already shown by apiCall
    }
  };

  const handleAnalyzeNote = async () => {
    if (!note.trim()) {
      onToast(t('bad', lang));
      return;
    }
    try {
      const r = await apiCall<AnalysisResult>(EP.analyze, { text: note.trim(), preview: true }, 'POST', onToast);
      onToast(`${r.label === 'Depressed' ? t('dep', lang) : t('non', lang)} (${r.conf}%)`);
      setShowCrisis(!!r.crisis || (r.label === 'Depressed' && r.sev === 'High'));
    } catch {
      // error toast already shown by apiCall
    }
  };

  const handleEdit = async (idx: number) => {
    const entry = entries[idx];
    if (!entry.id) return;
    const newNote = window.prompt(t('edit', lang), entry.n || '');
    if (newNote === null) return;
    const moodStr = window.prompt(t('editMood', lang), String(entry.m));
    if (moodStr === null) return;
    const mood = parseInt(moodStr, 10);
    if (!(mood >= 1 && mood <= 5)) {
      onToast(t('bad', lang));
      return;
    }
    try {
      const list = await apiCall<any[]>(EP.mood, { id: entry.id, note: newNote, mood }, 'PUT', onToast);
      onEntriesChange(mapMoods(list));
      onToast(t('saved', lang));
      onSummaryRefresh();
    } catch {
      // error toast already shown by apiCall
    }
  };

  const handleDelete = async (idx: number) => {
    const entry = entries[idx];
    if (!entry.id || !window.confirm(t('confirmDel', lang))) return;
    try {
      const list = await apiCall<any[]>(`${EP.mood}?id=${entry.id}`, null, 'DELETE', onToast);
      onEntriesChange(mapMoods(list));
      onSummaryRefresh();
    } catch {
      // error toast already shown by apiCall
    }
  };

  return (
    <div>
      <h2>{t('journal', lang)}</h2>
      {summary && (
        <p className="streak">
          {summary.streak > 0 ? `🔥 ${summary.streak} ${t('streak', lang)}` : t('streakNone', lang)}
        </p>
      )}

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
                aria-label={`${i}/5`}
              >
                {moodEmojis[i]}
              </button>
            ))}
          </div>

          <textarea
            id="jn"
            rows={2}
            maxLength={500}
            placeholder={t('note', lang)}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ margin: '8px 0' }}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn" onClick={handleSaveEntry}>
              {t('add', lang)}
            </button>
            <button type="button" className="btn g" onClick={handleAnalyzeNote}>
              {t('analyze', lang)}
            </button>
          </div>
          {showCrisis && <CrisisCard lang={lang} />}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <button type="button" className="btn g" style={{ padding: '2px 10px' }} onClick={() => shiftMonth(-1)}>
              ‹
            </button>
            <strong>{monthLabel}</strong>
            <button type="button" className="btn g" style={{ padding: '2px 10px' }} onClick={() => shiftMonth(1)}>
              ›
            </button>
          </div>
          <div className="cal">
            {Array.from({ length: firstDow }, (_, i) => (
              <i key={`b${i}`} style={{ visibility: 'hidden' }}></i>
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayStr = `${view.y}-${pad(view.m + 1)}-${pad(i + 1)}`;
              const found = byDate[dayStr];
              return (
                <i
                  key={i}
                  style={found ? { backgroundColor: moodColors[found.m], color: '#fff' } : undefined}
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
              key={j.id ?? i}
              style={{
                display: 'flex',
                gap: '10px',
                padding: '8px 0',
                borderBottom: '1px solid var(--bd)',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '20px' }}>{moodEmojis[j.m]}</span>
              <span className="mu">{j.d}</span>
              <span style={{ flex: 1, minWidth: '120px' }}>{j.n}</span>
              {j.a && (
                <span className={`pill ${j.a.label === 'Depressed' ? 'd' : 'n'}`}>
                  {j.a.label === 'Depressed' ? t('dep', lang) : t('non', lang)} {j.a.conf}%
                </span>
              )}
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
