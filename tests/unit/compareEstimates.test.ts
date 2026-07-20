import { describe, expect, it } from 'vitest';
import { compareEstimates, resolveAgreement } from '../../src/app/audio/ensemble/compareEstimates';
import type { EngineTempoEstimate } from '../../src/app/audio/ensemble/types';

function estimate(engine: 'custom' | 'rbpm', bpm: number): EngineTempoEstimate {
  return { engine, bpm, rawCandidates: [{ bpm, count: 10, confidence: 0.9 }], dominance: 0.9, sampleCount: 10, analyzedDurationSeconds: 10 };
}

describe('compareEstimates', () => {
  it('classifies the exact matrix from the spec', () => {
    expect(compareEstimates(128, 127)).toBe('near');
    expect(compareEstimates(128, 126)).toBe('near');
    expect(compareEstimates(128, 64)).toBe('half-double');
    expect(compareEstimates(75, 150)).toBe('half-double');
    expect(compareEstimates(103, 128)).toBe('conflict');
  });

  it('classifies additional single-octave family pairs as half-double', () => {
    expect(compareEstimates(60, 120)).toBe('half-double');
    expect(compareEstimates(120, 240)).toBe('half-double');
    expect(compareEstimates(45, 90)).toBe('half-double');
    expect(compareEstimates(90, 180)).toBe('half-double');
    expect(compareEstimates(70, 140)).toBe('half-double');
    expect(compareEstimates(100, 200)).toBe('half-double');
  });

  it('classifies a two-octave gap as conflict, not half-double', () => {
    // A single Half/Double button only moves one octave — a two-octave gap
    // is a genuine disagreement, not something to auto-resolve.
    expect(compareEstimates(60, 240)).toBe('conflict');
    expect(compareEstimates(45, 180)).toBe('conflict');
  });
});

describe('resolveAgreement', () => {
  it('delegates to compareEstimates when both engines have an estimate', () => {
    expect(resolveAgreement(estimate('custom', 128), estimate('rbpm', 127))).toBe('near');
    expect(resolveAgreement(estimate('custom', 128), estimate('rbpm', 64))).toBe('half-double');
  });

  it('reports single-engine when either estimate is missing', () => {
    expect(resolveAgreement(estimate('custom', 128), null)).toBe('single-engine');
    expect(resolveAgreement(null, estimate('rbpm', 128))).toBe('single-engine');
  });
});
