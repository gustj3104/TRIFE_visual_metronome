import { describe, expect, it } from 'vitest';
import {
  buildBpmDetectionResult,
  classifyConfidence,
  clusterBpmCandidates,
  computeConfidence,
  doubleBpmCandidate,
  foldBpmToRange,
  halfBpmCandidate,
  pickBestCluster,
} from '../../src/app/audio/bpmCandidates';
import { MAX_BPM } from '../../src/app/audio/constants';

describe('foldBpmToRange', () => {
  it('doubles values below the minimum', () => {
    expect(foldBpmToRange(30)).toBe(60);
    expect(foldBpmToRange(20)).toBe(40);
  });

  it('halves values above the maximum', () => {
    expect(foldBpmToRange(480)).toBe(240);
    expect(foldBpmToRange(300)).toBe(150);
  });

  it('leaves in-range values untouched', () => {
    expect(foldBpmToRange(128)).toBe(128);
  });

  it('returns NaN for non-finite or non-positive input', () => {
    expect(Number.isNaN(foldBpmToRange(0))).toBe(true);
    expect(Number.isNaN(foldBpmToRange(-10))).toBe(true);
    expect(Number.isNaN(foldBpmToRange(Infinity))).toBe(true);
  });
});

describe('clusterBpmCandidates', () => {
  it('groups values within tolerance into one cluster', () => {
    const clusters = clusterBpmCandidates([120, 121, 119, 120.5], 2);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.members).toHaveLength(4);
  });

  it('splits values further apart than tolerance into separate clusters', () => {
    const clusters = clusterBpmCandidates([90, 91, 140, 141], 2);
    expect(clusters).toHaveLength(2);
  });
});

describe('pickBestCluster', () => {
  it('returns the cluster with the most members', () => {
    const clusters = clusterBpmCandidates([100, 100, 100, 140], 2);
    const best = pickBestCluster(clusters);
    expect(best?.bpm).toBeCloseTo(100);
    expect(best?.members).toHaveLength(3);
  });

  it('returns null for an empty list', () => {
    expect(pickBestCluster([])).toBeNull();
  });
});

describe('computeConfidence', () => {
  it('is the ratio of cluster size to total intervals, clamped to [0,1]', () => {
    expect(computeConfidence(8, 10)).toBeCloseTo(0.8);
    expect(computeConfidence(10, 10)).toBe(1);
    expect(computeConfidence(0, 10)).toBe(0);
  });

  it('returns 0 when there are no intervals', () => {
    expect(computeConfidence(0, 0)).toBe(0);
  });
});

describe('classifyConfidence', () => {
  it('classifies at the documented thresholds', () => {
    expect(classifyConfidence(0.8)).toBe('high');
    expect(classifyConfidence(1)).toBe('high');
    expect(classifyConfidence(0.79)).toBe('medium');
    expect(classifyConfidence(0.55)).toBe('medium');
    expect(classifyConfidence(0.54)).toBe('low');
    expect(classifyConfidence(0)).toBe('low');
  });
});

describe('halfBpmCandidate / doubleBpmCandidate', () => {
  it('halves and rounds, returning null below MIN_BPM', () => {
    expect(halfBpmCandidate(128)).toBe(64);
    expect(halfBpmCandidate(80)).toBe(40); // exactly at the MIN_BPM boundary
    expect(halfBpmCandidate(78)).toBeNull(); // half is 39, just below MIN_BPM
  });

  it('doubles and rounds, returning null above MAX_BPM', () => {
    expect(doubleBpmCandidate(120)).toBe(240);
    expect(doubleBpmCandidate(MAX_BPM)).toBeNull();
  });
});

describe('buildBpmDetectionResult', () => {
  it('assembles bpm, confidence, half/double candidates, and source', () => {
    const result = buildBpmDetectionResult({ bpm: 100, confidence: 0.9, clusterSize: 9, totalIntervals: 10 }, 'file');
    expect(result).toEqual({
      bpm: 100,
      confidence: 0.9,
      halfBpm: 50,
      doubleBpm: 200,
      source: 'file',
    });
  });

  it('nulls out candidates that would fall outside the supported range', () => {
    const result = buildBpmDetectionResult({ bpm: MAX_BPM, confidence: 0.5, clusterSize: 1, totalIntervals: 2 }, 'microphone');
    expect(result.doubleBpm).toBeNull();
  });
});
