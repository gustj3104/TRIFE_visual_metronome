import { useCallback, useEffect, useRef, useState } from 'react';
import { BpmStabilizer } from '../audio/bpmStabilizer';
import { MIC_MAX_ANALYSIS_MS, MIC_SIGNAL_TOO_LOW_ONSET_FLOOR, MIC_STABILITY_TOLERANCE_BPM } from '../audio/constants';
import { createMicrophoneAnalyzer, type MicrophoneAnalyzerCallbacks, type MicrophoneAnalyzerHandle } from '../audio/createMicrophoneAnalyzer';
import { estimateBpmFromOnsets } from '../audio/estimateBpm';
import { LiveEnsembleStabilizer, type LiveEngineSample } from '../audio/ensemble/liveEnsembleStabilizer';
import type { EngineTempoEstimate } from '../audio/ensemble/types';
import { MicrophoneAnalysisError, microphoneErrorMessage, type MicrophoneErrorCode } from '../audio/errors';
import type { SignalQualityLevel } from '../audio/signalQuality';
import { getTempoEngineMode } from '../lib/tempoEngineMode';
import type { BpmEstimate, MicrophoneState } from '../audio/types';

export interface UseMicrophoneBpmResult {
  state: MicrophoneState;
  start: () => void;
  stop: () => void;
  /** Once a result is locked in, resumes analysis from a clean slate without a fresh permission/stream round-trip — the mic never turns off. No-op unless currently in `success`. */
  listenAgain: () => void;
}

const ACTIVE_STATUSES = new Set<MicrophoneState['status']>([
  'requesting-permission',
  'listening',
  'stabilizing',
  'success',
]);

function toCustomLiveEstimate(estimate: BpmEstimate, analyzedDurationSeconds: number): EngineTempoEstimate {
  return {
    engine: 'custom',
    bpm: estimate.bpm,
    rawCandidates: [{ bpm: estimate.bpm, count: estimate.clusterSize, confidence: estimate.confidence }],
    dominance: estimate.confidence,
    sampleCount: estimate.totalIntervals,
    analyzedDurationSeconds,
  };
}

/**
 * Owns microphone lifecycle (permission → analyzer → live BPM) and its
 * cleanup. `stop()` performs full teardown and always resets to `off`,
 * discarding any detected result — an already-applied metronome BPM lives
 * outside this hook and is untouched either way.
 *
 * Drives the custom engine's own `BpmStabilizer` (unchanged) AND, unless
 * running in 'custom-only' mode, rbpm's live AudioWorklet analyzer over the
 * SAME microphone stream, feeding both into a `LiveEnsembleStabilizer` which
 * decides when (and at what confidence) to report `success` — see the
 * project plan's point 5 for why a single engine's own success/stable event
 * is not sufficient on its own.
 */
export function useMicrophoneBpm(currentAppliedBpm: number): UseMicrophoneBpmResult {
  const [state, setState] = useState<MicrophoneState>({ status: 'off' });
  const analyzerRef = useRef<MicrophoneAnalyzerHandle | null>(null);
  const stabilizerRef = useRef<BpmStabilizer | null>(null);
  const ensembleRef = useRef<LiveEnsembleStabilizer | null>(null);
  const latestCustomRef = useRef<LiveEngineSample | null>(null);
  const latestRbpmRef = useRef<LiveEngineSample | null>(null);
  /** Kept fresh from onFrame (fires every animation frame) and reused for onRbpmEstimate ticks too, since rbpm's own callback doesn't carry an elapsed-time reading of its own. */
  const latestElapsedMsRef = useRef(0);
  const latestSignalQualityRef = useRef<SignalQualityLevel>('ok');
  const currentAppliedBpmRef = useRef(currentAppliedBpm);
  useEffect(() => {
    currentAppliedBpmRef.current = currentAppliedBpm;
  }, [currentAppliedBpm]);
  const hasSucceededRef = useRef(false);
  const disposedRef = useRef(false);
  const requestIdRef = useRef(0);
  const startedAtRef = useRef(0);
  const lastEmittedRef = useRef<{ status: string; candidateBpm: number | null; signalQuality: SignalQualityLevel }>({
    status: '',
    candidateBpm: null,
    signalQuality: 'ok',
  });

  const teardownAnalyzer = useCallback(() => {
    analyzerRef.current?.stop();
    analyzerRef.current = null;
  }, []);

  useEffect(
    () => () => {
      disposedRef.current = true;
      teardownAnalyzer();
    },
    [teardownAnalyzer],
  );

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    teardownAnalyzer();
    stabilizerRef.current = null;
    ensembleRef.current = null;
    latestCustomRef.current = null;
    latestRbpmRef.current = null;
    latestElapsedMsRef.current = 0;
    latestSignalQualityRef.current = 'ok';
    hasSucceededRef.current = false;
    lastEmittedRef.current = { status: '', candidateBpm: null, signalQuality: 'ok' };
    setState({ status: 'off' });
  }, [teardownAnalyzer]);

  const evaluateEnsemble = useCallback((requestId: number) => {
    if (disposedRef.current || requestIdRef.current !== requestId || hasSucceededRef.current) return;
    const ensemble = ensembleRef.current;
    if (!ensemble) return;

    const output = ensemble.update({
      custom: latestCustomRef.current,
      rbpm: latestRbpmRef.current,
      currentAppliedBpm: currentAppliedBpmRef.current,
      elapsedMs: latestElapsedMsRef.current,
      signalQuality: latestSignalQualityRef.current,
    });

    const signalQuality = latestSignalQualityRef.current;

    if (output.phase === 'success') {
      const changed =
        lastEmittedRef.current.status !== 'success' || lastEmittedRef.current.candidateBpm !== output.result.bpm;
      if (!changed) return;
      lastEmittedRef.current = { status: 'success', candidateBpm: output.result.bpm, signalQuality };
      hasSucceededRef.current = true;
      setState({ status: 'success', result: output.result });
      return;
    }

    const changed =
      lastEmittedRef.current.status !== output.phase ||
      lastEmittedRef.current.candidateBpm !== output.candidateBpm ||
      lastEmittedRef.current.signalQuality !== signalQuality;
    if (!changed) return;
    lastEmittedRef.current = { status: output.phase, candidateBpm: output.candidateBpm, signalQuality };

    if (output.phase === 'stabilizing') {
      setState({
        status: 'stabilizing',
        startedAt: startedAtRef.current,
        candidateBpm: output.candidateBpm,
        signalQuality,
      });
    } else {
      setState({ status: 'listening', startedAt: startedAtRef.current, signalQuality });
    }
  }, []);

  const start = useCallback(() => {
    if (ACTIVE_STATUSES.has(state.status)) return;

    const requestId = ++requestIdRef.current;
    const mode = getTempoEngineMode();
    hasSucceededRef.current = false;
    stabilizerRef.current = new BpmStabilizer();
    ensembleRef.current = new LiveEnsembleStabilizer();
    latestCustomRef.current = null;
    latestRbpmRef.current = null;
    latestElapsedMsRef.current = 0;
    latestSignalQualityRef.current = 'ok';
    lastEmittedRef.current = { status: '', candidateBpm: null, signalQuality: 'ok' };
    setState({ status: 'requesting-permission' });

    void (async () => {
      const analyzerCallbacks: MicrophoneAnalyzerCallbacks = {
        onFrame: (onsetTimesMs, elapsedMs, signalQuality) => {
          if (disposedRef.current || requestIdRef.current !== requestId || hasSucceededRef.current) return;
          const stabilizer = stabilizerRef.current;
          if (!stabilizer) return;
          latestElapsedMsRef.current = elapsedMs;
          latestSignalQualityRef.current = signalQuality.level;

          if (elapsedMs >= MIC_MAX_ANALYSIS_MS) {
            const code: MicrophoneErrorCode =
              signalQuality.level === 'too-loud'
                ? 'input-too-loud'
                : signalQuality.level === 'too-quiet' || onsetTimesMs.length < MIC_SIGNAL_TOO_LOW_ONSET_FLOOR
                  ? 'signal-too-low'
                  : 'no-stable-bpm';
            teardownAnalyzer();
            setState({ status: 'error', message: microphoneErrorMessage(code) });
            return;
          }

          // stabilizer.update() drives this engine's own "am I independently
          // stable" signal (its 3-consecutive-reads-over-MIC_MIN_ANALYSIS_MS
          // gate, unchanged) — estimateBpmFromOnsets is called again here
          // (same pure function, same inputs) only to recover the
          // clusterSize/totalIntervals BpmStabilizer's own public output
          // doesn't expose, needed for the ensemble's dominance/sample-count
          // gates.
          const stabilizerOutput = stabilizer.update(onsetTimesMs, elapsedMs);
          const rawEstimate = estimateBpmFromOnsets(
            onsetTimesMs.map((t) => t / 1000),
            MIC_STABILITY_TOLERANCE_BPM,
          );
          latestCustomRef.current = rawEstimate
            ? { estimate: toCustomLiveEstimate(rawEstimate, elapsedMs / 1000), isEngineStable: stabilizerOutput.phase === 'success' }
            : null;

          evaluateEnsemble(requestId);
        },
      };

      if (mode !== 'custom-only') {
        analyzerCallbacks.onRbpmEstimate = (estimate, stable) => {
          if (disposedRef.current || requestIdRef.current !== requestId || hasSucceededRef.current) return;
          latestRbpmRef.current = { estimate, isEngineStable: stable };
          evaluateEnsemble(requestId);
        };
        analyzerCallbacks.onRbpmError = () => {
          if (disposedRef.current || requestIdRef.current !== requestId) return;
          latestRbpmRef.current = null;
        };
      }

      let handle: MicrophoneAnalyzerHandle;
      try {
        handle = await createMicrophoneAnalyzer(analyzerCallbacks);
      } catch (err) {
        if (disposedRef.current || requestIdRef.current !== requestId) return;
        const code = err instanceof MicrophoneAnalysisError ? err.code : 'unsupported';
        setState({ status: 'error', message: microphoneErrorMessage(code) });
        return;
      }

      if (disposedRef.current || requestIdRef.current !== requestId) {
        handle.stop();
        return;
      }

      analyzerRef.current = handle;
      startedAtRef.current = Date.now();
      setState({ status: 'listening', startedAt: startedAtRef.current });
    })();
  }, [state.status, teardownAnalyzer, evaluateEnsemble]);

  const listenAgain = useCallback(() => {
    if (state.status !== 'success' || !analyzerRef.current) return;
    analyzerRef.current.reset();
    stabilizerRef.current = new BpmStabilizer();
    ensembleRef.current = new LiveEnsembleStabilizer();
    latestCustomRef.current = null;
    latestRbpmRef.current = null;
    latestElapsedMsRef.current = 0;
    latestSignalQualityRef.current = 'ok';
    hasSucceededRef.current = false;
    lastEmittedRef.current = { status: '', candidateBpm: null, signalQuality: 'ok' };
    startedAtRef.current = Date.now();
    setState({ status: 'listening', startedAt: startedAtRef.current });
  }, [state.status]);

  return { state, start, stop, listenAgain };
}
