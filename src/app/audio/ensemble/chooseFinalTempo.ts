import { foldBpmToRange } from '../bpmCandidates';
import type { EngineTempoEstimate, EstimateAgreement } from './types';

export interface FinalTempo {
  bpm: number;
  alternativeBpm: number | null;
}

/**
 * Picks the bpm to display. When the custom engine has an estimate, its
 * reading is always the anchor (it operates in the app's native 40-240
 * range, unlike rbpm's opaque 90-180 fold — see tempoAlignment.ts) — rbpm's
 * own reading becomes the `alternativeBpm` only on half-double agreement.
 * Falls back to rbpm's own (range-folded) reading when custom has none.
 */
export function chooseFinalTempo(
  custom: EngineTempoEstimate | null,
  rbpm: EngineTempoEstimate | null,
  agreement: EstimateAgreement,
): FinalTempo {
  if (custom) {
    const alternativeBpm = agreement === 'half-double' && rbpm ? Math.round(rbpm.bpm) : null;
    return { bpm: Math.round(custom.bpm), alternativeBpm };
  }
  if (rbpm) {
    return { bpm: Math.round(foldBpmToRange(rbpm.bpm)), alternativeBpm: null };
  }
  throw new Error('chooseFinalTempo requires at least one estimate');
}
