import { classifyConfidence } from '../../audio/bpmCandidates';
import type { BpmDetectionResult } from '../../audio/types';

interface BpmResultPanelProps {
  result: BpmDetectionResult;
  onApply: (bpm: number) => void;
  tp: string;
  ts: string;
  bg: string;
  border: string;
}

function candidateButtonStyle(border: string, ts: string, primary: boolean, tp: string, bg: string) {
  return {
    padding: '8px 2px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: primary ? 700 : 600,
    letterSpacing: '0.02em',
    border: `1px solid ${primary ? tp : border}`,
    background: primary ? tp : 'transparent',
    color: primary ? bg : ts,
  } as const;
}

export function BpmResultPanel({ result, onApply, tp, ts, bg, border }: BpmResultPanelProps) {
  const confidenceLevel = classifyConfidence(result.confidence);
  return (
    <div data-testid="bpm-detection-result">
      <div style={{ color: ts, fontSize: '0.7rem', letterSpacing: '0.14em', fontWeight: 700 }}>DETECTED BPM</div>
      <div style={{ color: tp, fontFamily: "'DM Mono', monospace", fontSize: '2rem', fontWeight: 700, lineHeight: 1.1 }}>
        {result.bpm}
      </div>
      <div data-testid="bpm-confidence" style={{ color: ts, fontSize: '0.76rem', marginTop: 2 }}>
        {confidenceLevel.toUpperCase()} CONFIDENCE
      </div>
      <div style={{ color: ts, fontSize: '0.66rem', marginTop: 2, opacity: 0.75 }}>
        Based on beat consistency, not a guarantee of accuracy.
      </div>
      {result.alternativeBpm != null && (
        <div data-testid="bpm-alternative" style={{ color: ts, fontSize: '0.72rem', marginTop: 6 }}>
          Alternative: {result.alternativeBpm} BPM
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 12 }}>
        <button
          disabled={result.halfBpm === null}
          onClick={() => result.halfBpm !== null && onApply(result.halfBpm)}
          data-testid="bpm-half-button"
          style={{ ...candidateButtonStyle(border, ts, false, tp, bg), opacity: result.halfBpm === null ? 0.4 : 1 }}
        >
          HALF {result.halfBpm ?? '—'}
        </button>
        <button
          onClick={() => onApply(result.bpm)}
          data-testid="bpm-apply-button"
          style={candidateButtonStyle(border, ts, true, tp, bg)}
        >
          APPLY {result.bpm}
        </button>
        <button
          disabled={result.doubleBpm === null}
          onClick={() => result.doubleBpm !== null && onApply(result.doubleBpm)}
          data-testid="bpm-double-button"
          style={{ ...candidateButtonStyle(border, ts, false, tp, bg), opacity: result.doubleBpm === null ? 0.4 : 1 }}
        >
          DOUBLE {result.doubleBpm ?? '—'}
        </button>
      </div>
    </div>
  );
}
