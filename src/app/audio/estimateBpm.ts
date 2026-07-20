import { clusterBpmCandidates, computeConfidence, foldBpmToRange, pickBestCluster } from './bpmCandidates';
import { CLUSTER_TOLERANCE_BPM, MIN_ONSETS_FOR_ESTIMATE } from './constants';
import type { BpmEstimate, OnsetTimesSec } from './types';

/** Converts a sequence of onset timestamps into inter-onset intervals, folds each into the supported BPM range, and clusters them to find the most repeated tempo. */
export function estimateBpmFromOnsets(
  onsetTimesSec: OnsetTimesSec,
  toleranceBpm = CLUSTER_TOLERANCE_BPM,
): BpmEstimate | null {
  if (onsetTimesSec.length < MIN_ONSETS_FOR_ESTIMATE) return null;

  const intervals: number[] = [];
  for (let i = 1; i < onsetTimesSec.length; i++) {
    const prev = onsetTimesSec[i - 1] ?? 0;
    const cur = onsetTimesSec[i] ?? 0;
    const interval = cur - prev;
    if (interval > 0) intervals.push(interval);
  }
  if (intervals.length === 0) return null;

  const foldedBpms = intervals.map((interval) => foldBpmToRange(60 / interval)).filter((bpm) => Number.isFinite(bpm));
  if (foldedBpms.length === 0) return null;

  const clusters = clusterBpmCandidates(foldedBpms, toleranceBpm);
  const best = pickBestCluster(clusters);
  if (!best) return null;

  return {
    bpm: Math.round(best.bpm),
    confidence: computeConfidence(best.members.length, foldedBpms.length),
    clusterSize: best.members.length,
    totalIntervals: foldedBpms.length,
  };
}
