import React, { useEffect, useState } from 'react';
import { Language, ModelInfo } from '../types';
import { t } from '../locales/i18n';
import { EP, apiCall } from '../services/api';

interface ModelMetricsProps {
  lang: Language;
}

const pct = (v: number): string => `${(v * 100).toFixed(1)}%`;

export const ModelMetricsCard: React.FC<ModelMetricsProps> = ({ lang }) => {
  const [info, setInfo] = useState<ModelInfo | null>(null);

  useEffect(() => {
    let alive = true;
    apiCall<ModelInfo>(EP.metrics, null, 'GET')
      .then((r) => {
        if (alive) setInfo(r);
      })
      .catch(() => {
        // backend offline: card stays empty
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!info) return null;
  const m = info.metrics;

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <h3>{t('metT', lang)}</h3>
      <p className="mu" style={{ margin: '6px 0' }}>
        {t('metEngine', lang)}: <strong>{info.engine}</strong>
      </p>
      {m ? (
        <>
          <div className="grid">
            {(
              [
                ['metAcc', m.accuracy],
                ['metPrec', m.precision],
                ['metRec', m.recall],
                ['metF1', m.f1],
              ] as [string, number][]
            ).map(([k, v]) => (
              <div key={k} className="card">
                <div className="mu">{t(k, lang)}</div>
                <div className="stat">{pct(v)}</div>
              </div>
            ))}
          </div>
          <h3 style={{ marginTop: '14px' }}>{t('metConf', lang)}</h3>
          <table className="cm">
            <thead>
              <tr>
                <th></th>
                <th>{t('metPredDep', lang)}</th>
                <th>{t('metPredNon', lang)}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>{t('metActDep', lang)}</th>
                <td>{m.confusion.tp}</td>
                <td>{m.confusion.fn}</td>
              </tr>
              <tr>
                <th>{t('metActNon', lang)}</th>
                <td>{m.confusion.fp}</td>
                <td>{m.confusion.tn}</td>
              </tr>
            </tbody>
          </table>
          <p className="mu" style={{ marginTop: '8px' }}>
            {m.samples} {t('metSamples', lang)} ({m.evaluated_on})
          </p>
        </>
      ) : (
        <p className="mu">{t('metNone', lang)}</p>
      )}
    </div>
  );
};
