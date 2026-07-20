import type { ConfidenceLevel } from '../bpmCandidates';
import {
  CUSTOM_MIN_SAMPLE_COUNT_FOR_HIGH,
  FAMILY_REPEAT_REQUIRED_FOR_HIGH,
  HIGH_CONFIDENCE_NUMBER,
  LOW_CONFIDENCE_NUMBER,
  MEDIUM_CONFIDENCE_NUMBER,
  MIN_DOMINANCE_GAP,
  NEAR_TOLERANCE_BPM,
  RBPM_MIN_CANDIDATE_COUNT_FOR_HIGH,
  STRONG_ALTERNATIVE_RATIO,
} from './constants';
import { octaveAlign } from './tempoAlignment';
import type { EngineTempoEstimate, EstimateAgreement } from './types';

/** Bridges a ConfidenceLevel into the existing 0..1 `BpmDetectionResult.confidence` field so the unmodified `classifyConfidence` in bpmCandidates.ts (>=0.8 high, >=0.55 medium, else low) still displays the level this module decided. */
export function confidenceLevelToNumber(level: ConfidenceLevel): number {
  if (level === 'high') return HIGH_CONFIDENCE_NUMBER;
  if (level === 'medium') return MEDIUM_CONFIDENCE_NUMBER;
  return LOW_CONFIDENCE_NUMBER;
}

export interface ConfidenceInput {
  agreement: EstimateAgreement;
  custom: EngineTempoEstimate | null;
  rbpm: EngineTempoEstimate | null;
  /** How many of the recent windows/segments/ticks agree with the final family (see FAMILY_REPEAT_WINDOW). */
  familyRepeatCount: number;
}

function qualifies(estimate: EngineTempoEstimate | null, minSampleCount: number): boolean {
  return estimate !== null && estimate.sampleCount >= minSampleCount && estimate.dominance >= MIN_DOMINANCE_GAP;
}

/**
 * True if any of the engine's OWN runner-up candidates sits at an octave
 * relationship to its own top pick and isn't negligibly weaker — i.e. the
 * engine itself saw a real competing half/double interpretation, not just a
 * clear single winner. Only meaningful for rbpm: its Tempo[] is a genuine
 * ranked candidate list, whereas the custom engine's rawCandidates is a
 * synthesized single-element list (estimateBpmFromOnsets, protected, doesn't
 * expose its discarded runner-up clusters) — so this can never flag a
 * custom-side alternative, only an rbpm-side one.
 */
function hasStrongOctaveAlternative(estimate: EngineTempoEstimate | null): boolean {
  if (!estimate || estimate.rawCandidates.length < 2) return false;
  const top = estimate.rawCandidates[0];
  if (!top || top.count <= 0) return false;
  return estimate.rawCandidates.slice(1).some((candidate) => {
    const { steps, diff } = octaveAlign(top.bpm, candidate.bpm);
    if (Math.abs(steps) !== 1 || diff > NEAR_TOLERANCE_BPM) return false;
    return candidate.count >= top.count * STRONG_ALTERNATIVE_RATIO;
  });
}

/**
 * `near` agreement between two same-algorithm-family engines does NOT alone
 * imply High confidence — both could make the identical halftime/doubletime
 * mistake. High additionally requires: enough samples and a clear
 * top-vs-runner-up gap from BOTH engines, and the same family repeating
 * across recent windows/ticks/segments (not a single lucky reading), and
 * neither engine's own candidate list showing a strong competing half/double
 * alternative (see hasStrongOctaveAlternative). half-double and single-engine
 * agreement never reach High — an unresolved alternative exists, or only one
 * engine looked at the signal at all.
 *
 * half-double/single-engine Medium is decided by whichever engine actually
 * produced the reading being "solid" on its own (dominance/sample-count) OR
 * repetition already being confirmed — NOT by requiring repetition alone:
 * for a live microphone stream repetition is already enforced upstream
 * (LiveEnsembleStabilizer only calls this once its own repeat gates pass),
 * but a single-shot file analysis has no meaningful "recent window" to
 * repeat across for a short (non-segmented) file, so a genuinely clean
 * single reading must still be able to reach Medium.
 */
export function calculateConfidence(input: ConfidenceInput): ConfidenceLevel {
  const { agreement, custom, rbpm, familyRepeatCount } = input;

  if (agreement === 'conflict') return 'low';

  const customQualifies = qualifies(custom, CUSTOM_MIN_SAMPLE_COUNT_FOR_HIGH);
  const rbpmQualifies = qualifies(rbpm, RBPM_MIN_CANDIDATE_COUNT_FOR_HIGH);
  const repeated = familyRepeatCount >= FAMILY_REPEAT_REQUIRED_FOR_HIGH;

  if (agreement === 'near') {
    const noStrongAlternative = !hasStrongOctaveAlternative(custom) && !hasStrongOctaveAlternative(rbpm);
    if (customQualifies && rbpmQualifies && repeated && noStrongAlternative) return 'high';
    return 'medium';
  }

  // half-double / single-engine: whichever engine actually produced the
  // reading is the one whose own solidity matters (chooseFinalTempo always
  // anchors on custom when both are present, so custom is "the" reading
  // there too).
  const solid = custom ? customQualifies : rbpmQualifies;
  return solid || repeated ? 'medium' : 'low';
}
