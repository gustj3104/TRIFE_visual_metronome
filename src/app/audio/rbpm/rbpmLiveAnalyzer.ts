import { createRealtimeBpmAnalyzer } from 'realtime-bpm-analyzer';
import type { BpmCandidates } from 'realtime-bpm-analyzer';
import type { EngineTempoEstimate } from '../ensemble/types';
import { normalizeRbpmResult } from './normalizeRbpmResult';

export interface RbpmLiveAnalyzerHandle {
  stop: () => void;
  /** Restarts rbpm's own internal stabilization window without a new AudioWorkletNode/permission round-trip. */
  reset: () => void;
}

export interface RbpmLiveAnalyzerCallbacks {
  onEstimate: (estimate: EngineTempoEstimate, stable: boolean) => void;
  onError: (error: unknown) => void;
}

const NOOP_HANDLE: RbpmLiveAnalyzerHandle = { stop: () => {}, reset: () => {} };

/**
 * Explicit rather than relying on the library's own defaults (which happen
 * to currently match these values) — self-documenting, and protects against
 * a future library version silently changing its defaults out from under
 * us. `continuousAnalysis: false` matches this app's own "lock once, then
 * require an explicit listenAgain() to re-analyze" UX rather than letting
 * rbpm keep re-emitting `bpmStable` on its own after the first one.
 */
const RBPM_LIVE_OPTIONS = {
  continuousAnalysis: false,
  stabilizationTime: 20_000,
};

/**
 * Wraps createRealtimeBpmAnalyzer and taps the SAME sourceNode the custom
 * engine's analyser already listens to — no second getUserMedia/AudioContext.
 * On any setup failure (worklet load rejected, unsupported browser), reports
 * via onError and returns a no-op handle so the caller can proceed with the
 * custom engine alone; this function itself never throws.
 */
export async function createRbpmLiveAnalyzer(
  audioContext: AudioContext,
  sourceNode: AudioNode,
  callbacks: RbpmLiveAnalyzerCallbacks,
): Promise<RbpmLiveAnalyzerHandle> {
  let analyzer;
  try {
    analyzer = await createRealtimeBpmAnalyzer(audioContext, RBPM_LIVE_OPTIONS);
  } catch (err) {
    callbacks.onError(err);
    return NOOP_HANDLE;
  }

  let startedAt = performance.now();
  let disposed = false;

  const forward = (data: BpmCandidates, stable: boolean) => {
    if (disposed) return;
    const estimate = normalizeRbpmResult(data.bpm, (performance.now() - startedAt) / 1000);
    if (estimate) callbacks.onEstimate(estimate, stable);
  };

  analyzer.on('bpm', (data) => forward(data, false));
  analyzer.on('bpmStable', (data) => forward(data, true));
  analyzer.on('error', ({ error }) => {
    if (!disposed) callbacks.onError(error);
  });

  try {
    // Not connected to audioContext.destination — matches the library's own
    // documented microphone usage, avoiding feedback; the worklet still
    // processes because it's reachable from the source node's active graph.
    sourceNode.connect(analyzer.node);
  } catch (err) {
    analyzer.stop();
    callbacks.onError(err);
    return NOOP_HANDLE;
  }

  return {
    stop: () => {
      if (disposed) return;
      disposed = true;
      try {
        analyzer.stop();
        analyzer.disconnect();
      } catch {
        // Already disconnected — nothing to do.
      }
    },
    reset: () => {
      startedAt = performance.now();
      analyzer.reset();
    },
  };
}
