import { analyzeFullBuffer } from 'realtime-bpm-analyzer';
import { clusterBpmCandidates, pickBestCluster } from '../bpmCandidates';
import { CLUSTER_TOLERANCE_BPM, FILE_FULL_ANALYSIS_MAX_SEC } from '../constants';
import { MIN_DOMINANCE_GAP, NEAR_TOLERANCE_BPM, RBPM_MIN_CANDIDATE_COUNT_FOR_HIGH } from '../ensemble/constants';
import { octaveAlign } from '../ensemble/tempoAlignment';
import type { EngineTempoEstimate } from '../ensemble/types';
import { normalizeRbpmResult } from './normalizeRbpmResult';

/**
 * Deliberately shorter than the custom engine's own FILE_SEGMENT_LENGTH_SEC
 * (25s): measured on a real machine, analyzeFullBuffer's per-segment cost
 * (OfflineAudioContext render + peak detection) is roughly proportional to
 * segment length — a 25s segment produced a single ~530-570ms main-thread
 * long task, an 8s segment ~65ms. rbpm's own algorithm doesn't need a full
 * 25s window to find a reliable tempo, so this trades a slightly shorter
 * analysis window for a meaningfully smaller main-thread block.
 */
const RBPM_SEGMENT_LENGTH_SEC = 12;

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function sliceAudioBuffer(buffer: AudioBuffer, startSample: number, lengthSamples: number): AudioBuffer {
  const length = Math.min(lengthSamples, buffer.length - startSample);
  const segment = new AudioBuffer({
    length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  });
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    segment.copyToChannel(buffer.getChannelData(ch).subarray(startSample, startSample + length), ch);
  }
  return segment;
}

/** Same start/middle/end windowing policy as analyzeAudioBuffer.ts (same FILE_FULL_ANALYSIS_MAX_SEC threshold for "is this file long enough to segment"), but with rbpm's own shorter RBPM_SEGMENT_LENGTH_SEC per segment. */
function buildSegments(buffer: AudioBuffer): AudioBuffer[] {
  const durationSec = buffer.length / buffer.sampleRate;
  if (durationSec <= FILE_FULL_ANALYSIS_MAX_SEC) return [buffer];

  const segmentLenSamples = Math.floor(RBPM_SEGMENT_LENGTH_SEC * buffer.sampleRate);
  const total = buffer.length;
  const starts = [0, Math.max(0, Math.floor(total / 2 - segmentLenSamples / 2)), Math.max(0, total - segmentLenSamples)];

  const segments: AudioBuffer[] = [];
  const seenStarts = new Set<number>();
  for (const start of starts) {
    if (seenStarts.has(start)) continue;
    seenStarts.add(start);
    segments.push(sliceAudioBuffer(buffer, start, segmentLenSamples));
  }
  return segments;
}

/** Combines per-segment rbpm estimates the same way analyzeAudioBuffer.ts combines the custom engine's per-segment estimates: cluster the segment BPMs and keep the members of the largest cluster (all segments here come from the SAME engine/fold-convention, so plain numeric clustering — not cross-engine octave alignment — is the right tool). */
function combineSegmentEstimates(estimates: EngineTempoEstimate[]): EngineTempoEstimate | null {
  if (estimates.length === 0) return null;
  if (estimates.length === 1) return estimates[0] ?? null;

  const clusters = clusterBpmCandidates(
    estimates.map((e) => e.bpm),
    CLUSTER_TOLERANCE_BPM,
  );
  const best = pickBestCluster(clusters);
  if (!best) return null;

  const members = estimates.filter((e) => Math.abs(e.bpm - best.bpm) <= CLUSTER_TOLERANCE_BPM);
  if (members.length === 0) return null;

  const rawCandidates = members.flatMap((m) => m.rawCandidates);
  const sampleCount = members.reduce((sum, m) => sum + m.sampleCount, 0);
  const dominance = members.reduce((sum, m) => sum + m.dominance, 0) / members.length;
  const analyzedDurationSeconds = members.reduce((sum, m) => sum + m.analyzedDurationSeconds, 0);

  return {
    engine: 'rbpm',
    bpm: best.bpm,
    rawCandidates,
    dominance,
    sampleCount,
    analyzedDurationSeconds,
  };
}

async function analyzeSingleSegment(segment: AudioBuffer): Promise<EngineTempoEstimate | null> {
  try {
    const tempos = await analyzeFullBuffer(segment);
    return normalizeRbpmResult(tempos, segment.length / segment.sampleRate);
  } catch {
    return null;
  }
}

/**
 * Analyzes a decoded file buffer with rbpm, yielding to the main thread
 * between segments (and after the custom engine, which runs first — see
 * useAudioFileAnalysis.ts) rather than racing both engines concurrently:
 * async concurrency isn't thread concurrency, and running both CPU-heavy
 * analyses "in parallel" via Promise.all would only make main-thread
 * blocking worse. Each segment's analyzeFullBuffer call still costs a
 * few hundred ms of synchronous work (OfflineAudioContext rendering + peak
 * detection, roughly proportional to RBPM_SEGMENT_LENGTH_SEC) — that
 * per-segment cost isn't reducible further without shortening the window
 * more, but for long files this function reduces how MANY segments pay it:
 * it analyzes the middle segment first and, if `customBpmHint` (the custom engine's own
 * reading, already computed by the time this runs) already agrees with it
 * and the reading looks solid on its own, returns immediately instead of
 * always analyzing all 3 — the common case only pays for one segment.
 */
export async function analyzeFileWithRbpm(
  buffer: AudioBuffer,
  customBpmHint: number | null = null,
): Promise<EngineTempoEstimate | null> {
  const segments = buildSegments(buffer);
  if (segments.length <= 1) {
    await yieldToMainThread();
    return analyzeSingleSegment(segments[0] ?? buffer);
  }

  const middleIndex = Math.min(1, segments.length - 1);
  await yieldToMainThread();
  const middleSegment = segments[middleIndex];
  const middleEstimate = middleSegment ? await analyzeSingleSegment(middleSegment) : null;

  if (middleEstimate && customBpmHint !== null) {
    const alignsWithCustom = octaveAlign(customBpmHint, middleEstimate.bpm).diff <= NEAR_TOLERANCE_BPM;
    const solidOnItsOwn =
      middleEstimate.dominance >= MIN_DOMINANCE_GAP && middleEstimate.sampleCount >= RBPM_MIN_CANDIDATE_COUNT_FOR_HIGH;
    if (alignsWithCustom && solidOnItsOwn) return middleEstimate;
  }

  const perSegmentEstimates = middleEstimate ? [middleEstimate] : [];
  for (let i = 0; i < segments.length; i++) {
    if (i === middleIndex) continue;
    await yieldToMainThread();
    const segment = segments[i];
    const estimate = segment ? await analyzeSingleSegment(segment) : null;
    if (estimate) perSegmentEstimates.push(estimate);
  }

  return combineSegmentEstimates(perSegmentEstimates);
}
