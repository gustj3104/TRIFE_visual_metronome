import { useEffect, useState } from 'react';
import { formatElapsed } from '../../lib/audioFormat';
import type { UseMicrophoneBpmResult } from '../../hooks/useMicrophoneBpm';
import type { SignalQualityLevel } from '../../audio/signalQuality';
import { BpmResultPanel } from './BpmDetectionResult';
import { LoadingIndicator } from './LoadingIndicator';

/** Shown alongside the listening/stabilizing indicators — a bad reading blocks locking a result (see LiveEnsembleStabilizer), so the user needs to know why nothing is confirming instead of it just looking stuck. */
function SignalQualityHint({ signalQuality, ts }: { signalQuality: SignalQualityLevel | undefined; ts: string }) {
  if (signalQuality === 'too-quiet') {
    return (
      <p data-testid="mic-signal-hint" style={{ color: ts, fontSize: '0.72rem', marginTop: 6 }}>
        SIGNAL TOO LOW — move closer to the speaker or increase the volume.
      </p>
    );
  }
  if (signalQuality === 'too-loud') {
    return (
      <p data-testid="mic-signal-hint" style={{ color: ts, fontSize: '0.72rem', marginTop: 6 }}>
        INPUT TOO LOUD — lower the volume or move farther from the speaker.
      </p>
    );
  }
  return null;
}

interface MicrophoneSourcePanelProps {
  microphone: UseMicrophoneBpmResult;
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

/**
 * Keyed by `startedAt` in its parent so a new listening session always
 * remounts (fresh `elapsedMs` state) instead of briefly showing the
 * previous session's elapsed time. `setElapsedMs` is only ever called from
 * the interval callback, never synchronously in the effect body.
 */
function ElapsedTicker({ startedAt, tp, ts }: { startedAt: number; tp: string; ts: string }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return <LoadingIndicator text={`LISTENING ${formatElapsed(elapsedMs)}`} tp={tp} ts={ts} testId="mic-analysis-loading" />;
}

export function MicrophoneSourcePanel({ microphone, onApplyBpm, tp, ts, panelBg, pBorder, hov }: MicrophoneSourcePanelProps) {
  const { state, start, stop, listenAgain } = microphone;

  const isOff = state.status === 'off';
  const isRequesting = state.status === 'requesting-permission';
  const isActive = state.status === 'listening' || state.status === 'stabilizing' || state.status === 'success';

  return (
    <div id="source-panel-microphone" role="tabpanel" aria-labelledby="source-tab-microphone">
      <button
        onClick={start}
        disabled={isRequesting}
        data-testid="start-listening-button"
        style={{
          width: '100%',
          padding: '9px 0',
          borderRadius: 8,
          cursor: isRequesting ? 'default' : 'pointer',
          background: 'transparent',
          color: isRequesting ? ts : tp,
          border: `1px solid ${pBorder}`,
          fontSize: '0.84rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
        }}
        onMouseEnter={(e) => {
          if (!isRequesting) (e.currentTarget as HTMLElement).style.background = hov;
        }}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        {isRequesting ? 'REQUESTING…' : 'START LISTENING'}
      </button>

      {isActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#e5484d', flexShrink: 0 }} />
          <span style={{ color: tp, fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.08em' }}>MIC ON</span>
        </div>
      )}

      <div style={{ marginTop: 14, borderTop: `1px solid ${pBorder}`, paddingTop: 12, minHeight: 190 }}>
        <SubLabel text="LIVE ANALYSIS" ts={ts} />

        {isOff && (
          <div aria-disabled="true" data-testid="mic-analysis-inactive" style={{ opacity: 0.4 }}>
            <p style={{ color: ts, fontSize: '0.8rem', margin: '0 0 2px' }}>Microphone is off</p>
            <p style={{ color: ts, fontSize: '0.76rem', margin: 0 }}>Turn on the microphone to begin live analysis.</p>
          </div>
        )}

        {isRequesting && (
          <LoadingIndicator text="REQUESTING MICROPHONE ACCESS…" tp={tp} ts={ts} testId="mic-analysis-loading" />
        )}

        {state.status === 'listening' && (
          <div data-testid="mic-listening">
            <ElapsedTicker key={state.startedAt} startedAt={state.startedAt} tp={tp} ts={ts} />
            <p style={{ color: ts, fontSize: '0.78rem', marginTop: 8 }}>Collecting beat data…</p>
            <p style={{ color: ts, fontSize: '0.72rem', marginTop: 2, opacity: 0.75 }}>
              This usually takes about 20 seconds.
            </p>
            <SignalQualityHint signalQuality={state.signalQuality} ts={ts} />
          </div>
        )}

        {state.status === 'stabilizing' && (
          <div data-testid="mic-stabilizing">
            <LoadingIndicator text="STABILIZING BPM…" tp={tp} ts={ts} testId="mic-analysis-loading" />
            {state.candidateBpm !== null && (
              <p style={{ color: tp, fontSize: '0.84rem', marginTop: 6, fontWeight: 600 }}>
                {state.candidateBpm} BPM candidate
              </p>
            )}
            <p style={{ color: ts, fontSize: '0.78rem', marginTop: 8 }}>Keep the beat audible.</p>
            <SignalQualityHint signalQuality={state.signalQuality} ts={ts} />
          </div>
        )}

        {state.status === 'error' && (
          <div role="alert" data-testid="mic-analysis-error">
            <p style={{ color: tp, fontSize: '0.8rem', lineHeight: 1.5, whiteSpace: 'pre-line', margin: '0 0 8px' }}>
              {state.message}
            </p>
            <button
              onClick={start}
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
              TRY AGAIN
            </button>
          </div>
        )}

        {state.status === 'success' && (
          <div>
            <BpmResultPanel result={state.result} onApply={onApplyBpm} tp={tp} ts={ts} bg={panelBg} border={pBorder} />
            <p style={{ color: ts, fontSize: '0.72rem', marginTop: 10 }}>
              The mic is still on. Result is locked — it won&apos;t keep changing on its own.
            </p>
            <button
              onClick={listenAgain}
              data-testid="listen-again-button"
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
              LISTEN AGAIN
            </button>
          </div>
        )}
      </div>

      {isActive && (
        <button
          onClick={stop}
          data-testid="stop-listening-button"
          style={{
            marginTop: 12,
            width: '100%',
            padding: '8px 0',
            borderRadius: 8,
            cursor: 'pointer',
            background: 'transparent',
            color: ts,
            border: `1px solid ${pBorder}`,
            fontSize: '0.78rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
          }}
        >
          STOP LISTENING
        </button>
      )}
    </div>
  );
}
