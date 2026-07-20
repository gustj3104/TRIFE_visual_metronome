import { buildBpmDetectionResult, clusterBpmCandidates, computeConfidence } from './bpmCandidates';
import { CLUSTER_TOLERANCE_BPM, FILE_FULL_ANALYSIS_MAX_SEC, FILE_MIN_USABLE_DURATION_SEC, FILE_SEGMENT_LENGTH_SEC } from './constants';
import { estimateBpmFromOnsets } from './estimateBpm';
import { FileAnalysisError } from './errors';
import { extractOnsets } from './extractOnsets';
import type { BpmDetectionResult, BpmEstimate } from './types';

/** Minimal surface of `AudioBuffer` this module needs — lets unit tests build a fake buffer instead of decoding real audio in jsdom. */
export interface AudioBufferLike {
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  getChannelData(channel: number): Float32Array;
}

function mixDownToMono(buffer: AudioBufferLike): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);

  const length = buffer.getChannelData(0).length;
  const mono = new Float32Array(length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] = (mono[i] ?? 0) + (data[i] ?? 0) / buffer.numberOfChannels;
    }
  }
  return mono;
}

/** Long files are analyzed in up to three windows (start/middle/end) instead of in full, bounding memory and CPU. Short files are analyzed whole. */
function buildAnalysisSegments(mono: Float32Array, sampleRate: number, durationSec: number): Float32Array[] {
  if (durationSec <= FILE_FULL_ANALYSIS_MAX_SEC) return [mono];

  const segmentLenSamples = Math.floor(FILE_SEGMENT_LENGTH_SEC * sampleRate);
  const total = mono.length;
  const starts = [0, Math.max(0, Math.floor(total / 2 - segmentLenSamples / 2)), Math.max(0, total - segmentLenSamples)];

  const segments: Float32Array[] = [];
  const seenStarts = new Set<number>();
  for (const start of starts) {
    if (seenStarts.has(start)) continue;
    seenStarts.add(start);
    segments.push(mono.subarray(start, Math.min(total, start + segmentLenSamples)));
  }
  return segments;
}

/** Combines per-segment BPM estimates, preferring a tempo that repeats across multiple segments over one that only appears in a single window. */
function combineSegmentEstimates(estimates: BpmEstimate[]): BpmEstimate | null {
  if (estimates.length === 0) return null;
  if (estimates.length === 1) return estimates[0] ?? null;

  const clusters = clusterBpmCandidates(
    estimates.map((e) => e.bpm),
    CLUSTER_TOLERANCE_BPM,
  );

  let bestMembers: BpmEstimate[] | null = null;
  for (const cluster of clusters) {
    const members = estimates.filter((e) => Math.abs(e.bpm - cluster.bpm) <= CLUSTER_TOLERANCE_BPM);
    if (!bestMembers || members.length > bestMembers.length) bestMembers = members;
  }
  if (!bestMembers || bestMembers.length === 0) return null;

  const totalIntervals = bestMembers.reduce((sum, e) => sum + e.totalIntervals, 0);
  const clusterSize = bestMembers.reduce((sum, e) => sum + e.clusterSize, 0);
  const avgBpm = bestMembers.reduce((sum, e) => sum + e.bpm, 0) / bestMembers.length;

  return {
    bpm: Math.round(avgBpm),
    confidence: computeConfidence(clusterSize, totalIntervals),
    clusterSize,
    totalIntervals,
  };
}

/** Shared by analyzeAudioBuffer and analyzeAudioBufferEstimate so both stay in sync automatically instead of duplicating the segment/onset/combine pipeline. */
function computeCombinedEstimate(buffer: AudioBufferLike): BpmEstimate {
  if (buffer.numberOfChannels < 1 || buffer.length === 0) throw new FileAnalysisError('no-audio-channel');

  const durationSec = buffer.length / buffer.sampleRate;
  if (durationSec < FILE_MIN_USABLE_DURATION_SEC) throw new FileAnalysisError('too-short');

  const mono = mixDownToMono(buffer);
  const segments = buildAnalysisSegments(mono, buffer.sampleRate, durationSec);

  const perSegmentEstimates: BpmEstimate[] = [];
  for (const segment of segments) {
    const onsets = extractOnsets(segment, buffer.sampleRate);
    const estimate = estimateBpmFromOnsets(onsets);
    if (estimate) perSegmentEstimates.push(estimate);
  }

  const combined = combineSegmentEstimates(perSegmentEstimates);
  if (!combined) throw new FileAnalysisError('no-stable-bpm');
  return combined;
}

export function analyzeAudioBuffer(buffer: AudioBufferLike): BpmDetectionResult {
  return buildBpmDetectionResult(computeCombinedEstimate(buffer), 'file');
}

/**
 * Same analysis as analyzeAudioBuffer, but returns the raw BpmEstimate
 * (bpm/confidence/clusterSize/totalIntervals) instead of the final
 * BpmDetectionResult — used by the ensemble code to compare this engine's
 * dominance/sample-count against rbpm's, which analyzeAudioBuffer's
 * already-finalized return value doesn't expose.
 */
export function analyzeAudioBufferEstimate(buffer: AudioBufferLike): BpmEstimate {
  return computeCombinedEstimate(buffer);
}
