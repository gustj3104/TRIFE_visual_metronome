import { foldBpmToRange } from '../bpmCandidates';
import { MAX_BPM, MIN_BPM } from '../constants';

export interface OctaveAlignment {
  /** Integer number of octave doublings (positive) or halvings (negative) of `a` that best aligns it to `b`. */
  steps: number;
  /** `a * 2^steps`. */
  aligned: number;
  /** `|aligned - b|`. */
  diff: number;
}

/**
 * Finds how many octaves apart two BPM readings are, rather than checking a
 * single hardcoded ×2/÷2 relationship — e.g. octaveAlign(64, 128) -> steps=1,
 * octaveAlign(45, 180) -> steps=2. Two engines' readings are only ever
 * genuinely comparable through octave alignment, since rbpm folds its output
 * into 90-180 while the custom engine's own range is 40-240 — the two can
 * legitimately differ by more than one octave step even when "agreeing".
 */
export function octaveAlign(a: number, b: number): OctaveAlignment {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
    return { steps: 0, aligned: a, diff: Infinity };
  }
  // `|| 0` normalizes -0 (e.g. from log2 of a ratio just under 1) to 0 —
  // `-0 === 0` numerically, but callers comparing `steps === 0` and any
  // strict-equality-based tests should never have to care about the sign bit.
  const steps = Math.round(Math.log2(b / a)) || 0;
  const aligned = a * 2 ** steps;
  return { steps, aligned, diff: Math.abs(aligned - b) };
}

/**
 * All octave-related candidates of `bpm` that fall within [min, max], e.g.
 * buildTempoFamily(120) -> [60, 120, 240]. Used only for same-source
 * historical "did recent windows repeat the same family" bucketing — NOT for
 * cross-engine pairwise agreement, which uses octaveAlign directly with a
 * strict ±1-step limit (see compareEstimates.ts).
 */
export function buildTempoFamily(bpm: number, min = MIN_BPM, max = MAX_BPM): number[] {
  const canonical = foldBpmToRange(bpm, min, max);
  if (!Number.isFinite(canonical)) return [];

  const family: number[] = [];
  let down = canonical;
  while (down >= min) {
    family.push(down);
    down /= 2;
  }
  let up = canonical * 2;
  while (up <= max) {
    family.push(up);
    up *= 2;
  }
  return family.sort((x, y) => x - y);
}
