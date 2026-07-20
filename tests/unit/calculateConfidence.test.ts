import { describe, expect, it } from 'vitest';
import { calculateConfidence } from '../../src/app/audio/ensemble/calculateConfidence';
import type { EngineTempoEstimate } from '../../src/app/audio/ensemble/types';

function solidCustom(bpm = 128): EngineTempoEstimate {
  return { engine: 'custom', bpm, rawCandidates: [{ bpm, count: 20, confidence: 0.9 }], dominance: 0.9, sampleCount: 20, analyzedDurationSeconds: 20 };
}
function solidRbpm(bpm = 128): EngineTempoEstimate {
  return { engine: 'rbpm', bpm, rawCandidates: [{ bpm, count: 10, confidence: 0.9 }], dominance: 0.9, sampleCount: 10, analyzedDurationSeconds: 20 };
}
function weakCustom(bpm = 128): EngineTempoEstimate {
  return { engine: 'custom', bpm, rawCandidates: [{ bpm, count: 3, confidence: 0.05 }], dominance: 0.05, sampleCount: 3, analyzedDurationSeconds: 5 };
}
function weakRbpm(bpm = 128): EngineTempoEstimate {
  return { engine: 'rbpm', bpm, rawCandidates: [{ bpm, count: 1, confidence: 0.05 }], dominance: 0.05, sampleCount: 1, analyzedDurationSeconds: 5 };
}

describe('calculateConfidence', () => {
  it('reaches High only for near agreement with both engines solid and repeated', () => {
    const level = calculateConfidence({ agreement: 'near', custom: solidCustom(), rbpm: solidRbpm(), familyRepeatCount: 2 });
    expect(level).toBe('high');
  });

  it('near agreement alone (without the extra gates) is Medium, not High', () => {
    // Reviewer's core point: two same-family engines agreeing on a single
    // reading must not be treated as High by itself.
    const level = calculateConfidence({ agreement: 'near', custom: solidCustom(), rbpm: solidRbpm(), familyRepeatCount: 0 });
    expect(level).toBe('medium');
  });

  it('near agreement with a weak engine caps at Medium even with repetition', () => {
    const level = calculateConfidence({ agreement: 'near', custom: weakCustom(), rbpm: solidRbpm(), familyRepeatCount: 2 });
    expect(level).toBe('medium');
  });

  it('half-double with a solid anchor engine is Medium', () => {
    const level = calculateConfidence({ agreement: 'half-double', custom: solidCustom(), rbpm: solidRbpm(64), familyRepeatCount: 0 });
    expect(level).toBe('medium');
  });

  it('half-double with a weak anchor and no repetition is Low', () => {
    const level = calculateConfidence({ agreement: 'half-double', custom: weakCustom(), rbpm: weakRbpm(64), familyRepeatCount: 0 });
    expect(level).toBe('low');
  });

  it('half-double with a weak anchor but confirmed repetition is Medium', () => {
    const level = calculateConfidence({ agreement: 'half-double', custom: weakCustom(), rbpm: weakRbpm(64), familyRepeatCount: 3 });
    expect(level).toBe('medium');
  });

  it('single-engine with a solid reading is Medium', () => {
    const level = calculateConfidence({ agreement: 'single-engine', custom: solidCustom(), rbpm: null, familyRepeatCount: 0 });
    expect(level).toBe('medium');
  });

  it('single-engine with a weak reading and no repetition is Low', () => {
    const level = calculateConfidence({ agreement: 'single-engine', custom: weakCustom(), rbpm: null, familyRepeatCount: 0 });
    expect(level).toBe('low');
  });

  it('conflict is always Low regardless of engine quality', () => {
    const level = calculateConfidence({ agreement: 'conflict', custom: solidCustom(), rbpm: solidRbpm(103), familyRepeatCount: 5 });
    expect(level).toBe('low');
  });

  it('a strong competing half/double candidate in rbpm\'s own list disqualifies High even with a clean near agreement', () => {
    const rbpmWithStrongAlternative: EngineTempoEstimate = {
      engine: 'rbpm',
      bpm: 128,
      rawCandidates: [
        { bpm: 128, count: 10, confidence: 0.9 },
        { bpm: 64, count: 7, confidence: 0.6 }, // 70% of the winner's count — a real competing interpretation
      ],
      dominance: 0.9,
      sampleCount: 10,
      analyzedDurationSeconds: 20,
    };
    const level = calculateConfidence({
      agreement: 'near',
      custom: solidCustom(),
      rbpm: rbpmWithStrongAlternative,
      familyRepeatCount: 2,
    });
    expect(level).toBe('medium');
  });

  it('a weak (negligible) runner-up candidate does not block High', () => {
    const rbpmWithWeakAlternative: EngineTempoEstimate = {
      engine: 'rbpm',
      bpm: 128,
      rawCandidates: [
        { bpm: 128, count: 20, confidence: 0.9 },
        { bpm: 64, count: 2, confidence: 0.1 }, // 10% of the winner's count — negligible
      ],
      dominance: 0.9,
      sampleCount: 20,
      analyzedDurationSeconds: 20,
    };
    const level = calculateConfidence({
      agreement: 'near',
      custom: solidCustom(),
      rbpm: rbpmWithWeakAlternative,
      familyRepeatCount: 2,
    });
    expect(level).toBe('high');
  });
});
