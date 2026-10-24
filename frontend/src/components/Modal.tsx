import React from 'react';
import { AnalysisResult, Language } from '../types';
import { ResultCard } from './ResultCard';

interface ModalProps {
  result: AnalysisResult | null;
  lang: Language;
  onClose: () => void;
  onSaveToJournal?: (entry: { m: number; d: string; n: string }) => void;
  onDownloadReport?: (name: string) => void;
}

export const Modal: React.FC<ModalProps> = ({
  result,
  lang,
  onClose,
  onSaveToJournal,
  onDownloadReport,
}) => {
  if (!result) return null;

  return (
    <div
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="card" style={{ maxWidth: '640px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <p style={{ fontWeight: 600, wordBreak: 'break-word', flex: 1, marginRight: '12px' }}>
            {result.text}
          </p>
          <button
            type="button"
            className="btn g"
            style={{ padding: '4px 10px', fontSize: '13px' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <ResultCard
          result={result}
          id="modal"
          lang={lang}
          onSaveToJournal={onSaveToJournal}
          onDownloadReport={onDownloadReport}
        />
      </div>
    </div>
  );
};
