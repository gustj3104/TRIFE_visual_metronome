import { CLUSTER_TOLERANCE_BPM, MAX_BPM, MIN_BPM } from './constants';
import type { AudioSource, BpmDetectionResult, BpmEstimate } from './types';

/** Doubles/halves a raw BPM guess until it falls inside [min, max]. */
export function foldBpmToRange(bpm: number, min = MIN_BPM, max = MAX_BPM): number {
  if (!Number.isFinite(bpm) || bpm <= 0) return NaN;
  let value = bpm;
  while (value < min) value *= 2;
  while (value > max) value /= 2;
  return value;
}

export interface BpmCluster {
  bpm: number;
  members: number[];
}

/** Greedy single-pass clustering over sorted values: a value joins the previous cluster if it's within `tolerance` of that cluster's running mean, else it starts a new one. */
export function clusterBpmCandidates(values: number[], tolerance = CLUSTER_TOLERANCE_BPM): BpmCluster[] {
  const sorted = [...values].sort((a, b) => a - b);
  const clusters: BpmCluster[] = [];
  for (const value of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && value - last.bpm <= tolerance) {
      last.members.push(value);
      last.bpm = last.members.reduce((sum, v) => sum + v, 0) / last.members.length;
    } else {
      clusters.push({ bpm: value, members: [value] });
    }
  }
  return clusters;
}

export function pickBestCluster(clusters: BpmCluster[]): BpmCluster | null {
  if (clusters.length === 0) return null;
  return clusters.reduce((best, c) => (c.members.length > best.members.length ? c : best));
}

export function computeConfidence(clusterSize: number, totalIntervals: number): number {
  if (totalIntervals <= 0) return 0;
  return Math.max(0, Math.min(1, clusterSize / totalIntervals));
}

export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * `confidence` is a beat-consistency ratio (how much of the onset timeline
 * agrees with the winning tempo cluster), not a calibrated probability that
 * the BPM is correct — showing it as a raw percentage invites users to read
 * it as "84% likely correct". A coarse label is honest about what it is.
 */
export function classifyConfidence(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.55) return 'medium';
  return 'low';
}

export function halfBpmCandidate(bpm: number): number | null {
  const half = Math.round(bpm / 2);
  return half >= MIN_BPM ? half : null;
}

export function doubleBpmCandidate(bpm: number): number | null {
  const double = Math.round(bpm * 2);
  return double <= MAX_BPM ? double : null;
}

export function buildBpmDetectionResult(estimate: BpmEstimate, source: AudioSource): BpmDetectionResult {
  return {
    bpm: estimate.bpm,
    confidence: estimate.confidence,
    halfBpm: halfBpmCandidate(estimate.bpm),
    doubleBpm: doubleBpmCandidate(estimate.bpm),
    source,
  };
}
