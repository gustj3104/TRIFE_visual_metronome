import { doubleBpmCandidate, halfBpmCandidate } from '../bpmCandidates';
import type { BpmDetectionResult } from '../types';
import { calculateConfidence, confidenceLevelToNumber } from './calculateConfidence';
import { chooseFinalTempo } from './chooseFinalTempo';
import { compareEstimates } from './compareEstimates';
import {
  ENSEMBLE_HALFDOUBLE_REQUIRED_REPEATS,
  ENSEMBLE_HISTORY_SIZE,
  ENSEMBLE_NEAR_REQUIRED_REPEATS,
  ENSEMBLE_SINGLE_ENGINE_REQUIRED_REPEATS,
  MIN_ELAPSED_MS_BEFORE_LOCK,
  NEAR_TOLERANCE_BPM,
} from './constants';
import { octaveAlign } from './tempoAlignment';
import type { BpmEngine, EngineTempoEstimate, EstimateAgreement } from './types';
import type { SignalQualityLevel } from '../signalQuality';

/** A single engine's latest reading plus whether that engine has independently reached its own "stable" signal (custom: its BpmStabilizer succeeded; rbpm: it emitted 'bpmStable'). */
export interface LiveEngineSample {
  estimate: EngineTempoEstimate;
  isEngineStable: boolean;
}

export interface LiveEnsembleInput {
  custom: LiveEngineSample | null;
  rbpm: LiveEngineSample | null;
  /** BPM currently applied to the running metronome, if any — used as one of the two accepted "family anchors" for a half-double lock. */
  currentAppliedBpm: number | null;
  /** Milliseconds since listening started — gates MIN_ELAPSED_MS_BEFORE_LOCK regardless of how fast the engines' own repeat gates are satisfied. */
  elapsedMs: number;
  /** Raw-signal quality (RMS/clipping), independent of whether onsets are being found at all — a bad reading blocks locking rather than confirming a result the input quality can't support. */
  signalQuality: SignalQualityLevel;
}

export type LiveEnsembleOutput =
  | { phase: 'listening' | 'stabilizing'; candidateBpm: number | null }
  | { phase: 'success'; result: BpmDetectionResult };

/**
 * Live (microphone) counterpart to the single-engine `BpmStabilizer`, but at
 * the ensemble level: tracks recent custom/rbpm agreement over time and only
 * locks a result once BOTH engines have reached their own stable signal AND
 * the ensemble comparison itself has repeated AND at least
 * MIN_ELAPSED_MS_BEFORE_LOCK has passed AND the raw signal quality is 'ok'
 * — a single `bpmStable` event or a single custom-engine success (which
 * alone can fire in ~6s) is not sufficient on its own, the faster of the two
 * engines stabilizing doesn't get to short-circuit waiting for the slower
 * one, and a quiet/clipping input never gets to confirm a result no matter
 * how many repeats it produces.
 */
export class LiveEnsembleStabilizer {
  private history: Array<{ agreement: EstimateAgreement; referenceBpm: number }> = [];
  private lockedBpm: number | null = null;

  reset(): void {
    this.history = [];
    this.lockedBpm = null;
  }

  update(input: LiveEnsembleInput): LiveEnsembleOutput {
    const { custom, rbpm, currentAppliedBpm, elapsedMs, signalQuality } = input;
    const canLock = elapsedMs >= MIN_ELAPSED_MS_BEFORE_LOCK && signalQuality === 'ok';

    if (custom && rbpm) return this.updateBothEngines(custom, rbpm, currentAppliedBpm, canLock);
    const single = custom ?? rbpm;
    if (single) return this.updateSingleEngine(single, canLock);
    return { phase: 'listening', candidateBpm: null };
  }

  private pushAndCount(agreement: EstimateAgreement, referenceBpm: number): number {
    this.history.push({ agreement, referenceBpm });
    if (this.history.length > ENSEMBLE_HISTORY_SIZE) this.history.shift();
    return this.history.filter(
      (h) => h.agreement === agreement && Math.abs(h.referenceBpm - referenceBpm) <= NEAR_TOLERANCE_BPM,
    ).length;
  }

  private matchesLockedOrAppliedFamily(referenceBpm: number, currentAppliedBpm: number | null): boolean {
    if (this.lockedBpm !== null && octaveAlign(this.lockedBpm, referenceBpm).diff <= NEAR_TOLERANCE_BPM) return true;
    if (currentAppliedBpm !== null) {
      const { steps, diff } = octaveAlign(currentAppliedBpm, referenceBpm);
      if (Math.abs(steps) <= 1 && diff <= NEAR_TOLERANCE_BPM) return true;
    }
    return false;
  }

  private updateBothEngines(
    custom: LiveEngineSample,
    rbpm: LiveEngineSample,
    currentAppliedBpm: number | null,
    canLock: boolean,
  ): LiveEnsembleOutput {
    const agreement = compareEstimates(custom.estimate.bpm, rbpm.estimate.bpm);
    const referenceBpm = custom.estimate.bpm; // custom is always the octave anchor
    const repeats = this.pushAndCount(agreement, referenceBpm);
    // BOTH engines must reach their own stability signal — not just
    // whichever is faster. The custom engine's own gate can fire as early as
    // MIC_MIN_ANALYSIS_MS (6s), which alone is too fast to trust; requiring
    // rbpm's own (much slower, ~20s by default) judgment too is what keeps
    // an ensemble lock from firing at custom's speed just because it happens
    // to already agree with rbpm's still-settling reading.
    const engineStable = custom.isEngineStable && rbpm.isEngineStable;

    if (agreement === 'conflict') {
      return { phase: 'stabilizing', candidateBpm: null };
    }

    if (agreement === 'near') {
      if (canLock && engineStable && repeats >= ENSEMBLE_NEAR_REQUIRED_REPEATS) {
        return this.lock(custom.estimate, rbpm.estimate, agreement, repeats);
      }
      return { phase: 'stabilizing', candidateBpm: Math.round(referenceBpm) };
    }

    // half-double — slower to auto-confirm: must also match a previously
    // locked or currently-applied tempo family, and repeat more times.
    const matchesContext = this.matchesLockedOrAppliedFamily(referenceBpm, currentAppliedBpm);
    if (canLock && engineStable && matchesContext && repeats >= ENSEMBLE_HALFDOUBLE_REQUIRED_REPEATS) {
      return this.lock(custom.estimate, rbpm.estimate, agreement, repeats);
    }
    return { phase: 'stabilizing', candidateBpm: Math.round(referenceBpm) };
  }

  private updateSingleEngine(single: LiveEngineSample, canLock: boolean): LiveEnsembleOutput {
    const referenceBpm = single.estimate.bpm;
    const repeats = this.pushAndCount('single-engine', referenceBpm);

    if (canLock && single.isEngineStable && repeats >= ENSEMBLE_SINGLE_ENGINE_REQUIRED_REPEATS) {
      const custom = single.estimate.engine === 'custom' ? single.estimate : null;
      const rbpm = single.estimate.engine === 'rbpm' ? single.estimate : null;
      return this.lock(custom, rbpm, 'single-engine', repeats);
    }
    return { phase: 'stabilizing', candidateBpm: Math.round(referenceBpm) };
  }

  private lock(
    custom: EngineTempoEstimate | null,
    rbpm: EngineTempoEstimate | null,
    agreement: EstimateAgreement,
    familyRepeatCount: number,
  ): LiveEnsembleOutput {
    const { bpm, alternativeBpm } = chooseFinalTempo(custom, rbpm, agreement);
    const level = calculateConfidence({ agreement, custom, rbpm, familyRepeatCount });
    this.lockedBpm = bpm;

    const engine: BpmEngine = custom && rbpm ? 'ensemble' : custom ? 'custom' : 'rbpm';
    const estimates = [custom, rbpm].filter((e): e is EngineTempoEstimate => e !== null);

    const result: BpmDetectionResult = {
      bpm,
      confidence: confidenceLevelToNumber(level),
      halfBpm: halfBpmCandidate(bpm),
      doubleBpm: doubleBpmCandidate(bpm),
      source: 'microphone',
      engine,
      estimates,
      alternativeBpm,
    };
    return { phase: 'success', result };
  }
}
