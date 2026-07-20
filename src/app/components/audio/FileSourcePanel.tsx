import { useRef } from 'react';
import { ACCEPT_ATTRIBUTE } from '../../audio/constants';
import { formatDuration, formatFileSize } from '../../lib/audioFormat';
import type { UseAudioFileAnalysisResult } from '../../hooks/useAudioFileAnalysis';
import { BpmResultPanel } from './BpmDetectionResult';
import { LoadingIndicator } from './LoadingIndicator';

interface FileSourcePanelProps {
  fileAnalysis: UseAudioFileAnalysisResult;
  onApplyBpm: (bpm: number) => void;
  tp: string;
  ts: string;
  panelBg: string;
  pBorder: string;
  hov: string;
}

function SubLabel({ text, ts }: { text: string; ts: string }) {
  return (
    <div style={{ color: ts, fontSize: '0.72rem', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 8 }}>{text}</div>
  );
}

export function FileSourcePanel({ fileAnalysis, onApplyBpm, tp, ts, panelBg, pBorder, hov }: FileSourcePanelProps) {
  const { state, durationSec, selectFile, removeFile } = fileAnalysis;
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => inputRef.current?.click();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) selectFile(file);
  };

  const currentFile = state.status !== 'empty' ? state.file : null;
  const isEmpty = state.status === 'empty';
  const isError = state.status === 'error';

  return (
    <div id="source-panel-file" role="tabpanel" aria-labelledby="source-tab-file">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        onChange={handleChange}
        aria-label="Upload audio file"
        data-testid="file-input"
        style={{ display: 'none' }}
      />
      <button
        onClick={openPicker}
        data-testid="upload-audio-button"
        style={{
          width: '100%',
          padding: '9px 0',
          borderRadius: 8,
          cursor: 'pointer',
          background: 'transparent',
          color: tp,
          border: `1px solid ${pBorder}`,
          fontSize: '0.84rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = hov)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
        UPLOAD AUDIO
      </button>

      {currentFile && (
        <div style={{ marginTop: 10 }}>
          <div
            data-testid="selected-file-name"
            title={currentFile.name}
            style={{ color: tp, fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {currentFile.name}
          </div>
          <div style={{ color: ts, fontSize: '0.72rem', marginTop: 2 }}>
            {formatFileSize(currentFile.size)}
            {durationSec !== null ? ` · ${formatDuration(durationSec)}` : ''}
          </div>
          <button
            onClick={removeFile}
            data-testid="remove-file-button"
            style={{
              marginTop: 8,
              padding: '6px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              background: 'transparent',
              color: ts,
              border: `1px solid ${pBorder}`,
              fontSize: '0.74rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
            }}
          >
            REMOVE FILE
          </button>
        </div>
      )}

      <div style={{ marginTop: 14, borderTop: `1px solid ${pBorder}`, paddingTop: 12, minHeight: 150 }}>
        <SubLabel text="FILE ANALYSIS" ts={ts} />

        {isEmpty && (
          <div aria-disabled="true" data-testid="file-analysis-inactive" style={{ opacity: 0.4 }}>
            <p style={{ color: ts, fontSize: '0.8rem', margin: '0 0 2px' }}>No audio file selected</p>
            <p style={{ color: ts, fontSize: '0.76rem', margin: 0 }}>Upload an audio file to enable analysis.</p>
          </div>
        )}

        {state.status === 'decoding' && (
          <LoadingIndicator text="DECODING AUDIO…" tp={tp} ts={ts} testId="file-analysis-loading" />
        )}

        {state.status === 'analyzing' && (
          <LoadingIndicator
            text={state.stage === 'beats' ? 'ANALYZING BEATS…' : 'FINALIZING…'}
            tp={tp}
            ts={ts}
            testId="file-analysis-loading"
          />
        )}

        {isError && (
          <div role="alert" data-testid="file-analysis-error">
            <p style={{ color: tp, fontSize: '0.8rem', lineHeight: 1.5, whiteSpace: 'pre-line', margin: '0 0 8px' }}>
              {state.message}
            </p>
            <button
              onClick={openPicker}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                background: 'transparent',
                color: ts,
                border: `1px solid ${pBorder}`,
                fontSize: '0.74rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
              }}
            >
              CHOOSE ANOTHER FILE
            </button>
          </div>
        )}

        {state.status === 'success' && (
          <BpmResultPanel result={state.result} onApply={onApplyBpm} tp={tp} ts={ts} bg={panelBg} border={pBorder} />
        )}
      </div>
    </div>
  );
}
