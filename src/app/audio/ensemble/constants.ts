// Ensemble policy knobs — how strictly the custom and rbpm engines must agree
// before we trust/lock a result. Kept separate from audio/constants.ts, which
// holds raw single-engine DSP knobs.

/** Two BPMs within this many beats/minute of each other (after octave alignment) count as "the same tempo". */
export const NEAR_TOLERANCE_BPM = 2;

/** Minimum "top candidate vs runner-up" dominance (0..1) required from BOTH engines for High confidence. */
export const MIN_DOMINANCE_GAP = 0.15;

/** Minimum onset-interval sample count from the custom engine required for High confidence. */
export const CUSTOM_MIN_SAMPLE_COUNT_FOR_HIGH = 8;

/** Minimum top-candidate peak count from rbpm required for High confidence. */
export const RBPM_MIN_CANDIDATE_COUNT_FOR_HIGH = 4;

/** If a runner-up candidate at an octave relationship to the winner has at least this fraction of the winner's count, it's a "strong" competing half/double alternative — disqualifies High confidence even on otherwise-clean near agreement. */
export const STRONG_ALTERNATIVE_RATIO = 0.6;

/** How many recent windows/segments/ticks are considered when checking family-repetition. */
export const FAMILY_REPEAT_WINDOW = 3;

/** Of the last FAMILY_REPEAT_WINDOW samples, how many must agree with the final family for High confidence. */
export const FAMILY_REPEAT_REQUIRED_FOR_HIGH = 2;

// Live ensemble stabilizer: how many recent ensemble ticks are kept for repetition checks.
export const ENSEMBLE_HISTORY_SIZE = 5;

/** near agreement: required repeated ensemble ticks (in addition to an engine's own "stable" signal) before locking. */
export const ENSEMBLE_NEAR_REQUIRED_REPEATS = 2;

/** half-double agreement: required repeats before locking — intentionally higher than near, since this auto-confirms a more ambiguous result. */
export const ENSEMBLE_HALFDOUBLE_REQUIRED_REPEATS = 3;

/** single-engine (other engine unavailable/errored): required repeats of its own candidate before locking. */
export const ENSEMBLE_SINGLE_ENGINE_REQUIRED_REPEATS = 2;

/**
 * Absolute floor on elapsed listening time before ANY live lock (near,
 * half-double, or single-engine) — regardless of how quickly the individual
 * engines' own repeat gates are satisfied. The custom engine's own
 * BpmStabilizer can report success as early as MIC_MIN_ANALYSIS_MS (6s,
 * audio/constants.ts), which is too fast to trust in real (non-synthetic)
 * microphone conditions on its own.
 *
 * This is a floor for ALL modes, not the effective wait time in every mode:
 * - custom-only, or rbpm unavailable/errored (single-engine fallback): this
 *   12s floor IS the effective minimum, gated only on the one available
 *   engine's own stability (see updateSingleEngine — it does NOT wait on
 *   the other engine, which doesn't exist in this path).
 * - ensemble (both engines present): near/half-double additionally require
 *   BOTH engines' own stability signal (see updateBothEngines), and rbpm's
 *   own stabilizationTime defaults to 20s (rbpm/rbpmLiveAnalyzer.ts) — so
 *   the ensemble path's REAL minimum is effectively ~20s, driven by rbpm,
 *   not this constant. Keep this floor mainly as: (a) the true minimum for
 *   the single-engine fallback path, and (b) a safety net if rbpm's
 *   stabilizationTime is ever tuned down below 12s.
 */
export const MIN_ELAPSED_MS_BEFORE_LOCK = 12_000;

// Numeric bridges into the existing 0..1 `BpmDetectionResult.confidence` field
// so the unmodified `classifyConfidence` (>=0.8 high, >=0.55 medium, else low)
// in bpmCandidates.ts still displays the level calculateConfidence.ts decided.
export const HIGH_CONFIDENCE_NUMBER = 0.9;
export const MEDIUM_CONFIDENCE_NUMBER = 0.65;
export const LOW_CONFIDENCE_NUMBER = 0.3;
