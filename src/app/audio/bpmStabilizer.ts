import { buildBpmDetectionResult } from './bpmCandidates';
import {
  MIC_MIN_ANALYSIS_MS,
  MIC_MIN_ONSET_COUNT,
  MIC_REQUIRED_STABLE_ESTIMATES,
  MIC_STABILITY_TOLERANCE_BPM,
} from './constants';
import { estimateBpmFromOnsets } from './estimateBpm';
import type { BpmDetectionResult } from './types';

export type BpmStabilizerPhase = 'listening' | 'stabilizing' | 'success';

export interface BpmStabilizerOutput {
  phase: BpmStabilizerPhase;
  candidateBpm: number | null;
  result?: BpmDetectionResult;
}

/**
 * Tracks recent live BPM estimates and only reports "success" once several
 * consecutive readings agree within tolerance — this is what keeps the
 * displayed live BPM from jittering beat to beat.
 */
export class BpmStabilizer {
  private recentBpms: number[] = [];

  reset(): void {
    this.recentBpms = [];
  }

  update(onsetTimesMs: number[], elapsedMs: number): BpmStabilizerOutput {
    if (onsetTimesMs.length < 2) return { phase: 'listening', candidateBpm: null };

    const estimate = estimateBpmFromOnsets(
      onsetTimesMs.map((t) => t / 1000),
      MIC_STABILITY_TOLERANCE_BPM,
    );
    if (!estimate) return { phase: 'listening', candidateBpm: null };

    this.recentBpms.push(estimate.bpm);
    if (this.recentBpms.length > MIC_REQUIRED_STABLE_ESTIMATES) this.recentBpms.shift();

    const hasEnoughData = elapsedMs >= MIC_MIN_ANALYSIS_MS && onsetTimesMs.length >= MIC_MIN_ONSET_COUNT;
    const isStable =
      this.recentBpms.length === MIC_REQUIRED_STABLE_ESTIMATES &&
      this.recentBpms.every((bpm) => Math.abs(bpm - estimate.bpm) <= MIC_STABILITY_TOLERANCE_BPM);

    if (hasEnoughData && isStable) {
      return {
        phase: 'success',
        candidateBpm: estimate.bpm,
        result: buildBpmDetectionResult(estimate, 'microphone'),
      };
    }

    return { phase: 'stabilizing', candidateBpm: estimate.bpm };
  }
}
