import { NEAR_TOLERANCE_BPM } from './constants';
import { octaveAlign } from './tempoAlignment';
import type { EngineTempoEstimate, EstimateAgreement } from './types';

/**
 * Classifies the relationship between two raw BPM numbers by octave
 * alignment (see tempoAlignment.ts) rather than a single hardcoded ×2/÷2
 * check: exact-octave-match within tolerance -> 'near'; exactly one octave
 * apart -> 'half-double'; anything else (including >=2 octaves apart, or a
 * same-octave mismatch beyond tolerance) -> 'conflict'. Two octaves apart is
 * deliberately NOT treated as half-double — a single Half/Double button click
 * only moves one octave, and a larger gap is a genuine disagreement that
 * should not be auto-resolved.
 */
export function compareEstimates(a: number, b: number): EstimateAgreement {
  const { steps, diff } = octaveAlign(a, b);
  if (diff > NEAR_TOLERANCE_BPM) return 'conflict';
  if (steps === 0) return 'near';
  if (Math.abs(steps) === 1) return 'half-double';
  return 'conflict';
}

/** Real-world entrypoint: handles the case where one or both engines produced no estimate at all. */
export function resolveAgreement(
  custom: EngineTempoEstimate | null,
  rbpm: EngineTempoEstimate | null,
): EstimateAgreement {
  if (custom && rbpm) return compareEstimates(custom.bpm, rbpm.bpm);
  return 'single-engine';
}
