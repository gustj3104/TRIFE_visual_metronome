import type { EngineTempoEstimate, TempoCandidate } from '../ensemble/types';

/** Shape-compatible with realtime-bpm-analyzer's `Tempo` — declared locally so this module doesn't need the package's types at the call site (callers may pass data straight off a worklet message). */
export interface RawTempoCandidate {
  tempo: number;
  count: number;
  confidence: number;
}

/**
 * Converts rbpm's ranked candidate list into an EngineTempoEstimate.
 * Deliberately does NOT fold/reinterpret `tempo` — rbpm already folds every
 * value into 90-180 internally and that fold is opaque/irreversible, so
 * passing it through as-is (rather than re-processing it as if it were a
 * fresh, un-folded reading) is what lets the ensemble code correctly reason
 * about it via octave alignment.
 */
export function normalizeRbpmResult(
  candidates: readonly RawTempoCandidate[],
  analyzedDurationSeconds: number,
): EngineTempoEstimate | null {
  const valid = candidates.filter(
    (c) => Number.isFinite(c.tempo) && c.tempo > 0 && Number.isFinite(c.count) && c.count > 0,
  );
  if (valid.length === 0) return null;

  const rawCandidates: TempoCandidate[] = valid.map((c) => ({
    bpm: c.tempo,
    count: c.count,
    confidence: Number.isFinite(c.confidence) ? c.confidence : 0,
  }));

  const top = rawCandidates[0];
  if (!top) return null;
  const runnerUp = rawCandidates[1];
  const dominance = runnerUp ? Math.max(0, Math.min(1, (top.count - runnerUp.count) / top.count)) : 1;

  return {
    engine: 'rbpm',
    bpm: top.bpm,
    rawCandidates,
    dominance,
    sampleCount: top.count,
    analyzedDurationSeconds,
  };
}
