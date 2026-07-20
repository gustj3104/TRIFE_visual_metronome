import { describe, expect, it } from 'vitest';
import { chooseFinalTempo } from '../../src/app/audio/ensemble/chooseFinalTempo';
import type { EngineTempoEstimate } from '../../src/app/audio/ensemble/types';

function estimate(engine: 'custom' | 'rbpm', bpm: number): EngineTempoEstimate {
  return { engine, bpm, rawCandidates: [{ bpm, count: 10, confidence: 0.9 }], dominance: 0.9, sampleCount: 10, analyzedDurationSeconds: 10 };
}

describe('chooseFinalTempo', () => {
  it('anchors on the custom engine when both are present and near', () => {
    const result = chooseFinalTempo(estimate('custom', 128), estimate('rbpm', 127), 'near');
    expect(result).toEqual({ bpm: 128, alternativeBpm: null });
  });

  it('surfaces rbpm as the alternative on half-double agreement, anchored on custom', () => {
    const result = chooseFinalTempo(estimate('custom', 128), estimate('rbpm', 64), 'half-double');
    expect(result).toEqual({ bpm: 128, alternativeBpm: 64 });
  });

  it('has no alternative when only custom is present', () => {
    const result = chooseFinalTempo(estimate('custom', 128), null, 'single-engine');
    expect(result).toEqual({ bpm: 128, alternativeBpm: null });
  });

  it('falls back to a range-folded rbpm reading when only rbpm is present', () => {
    const result = chooseFinalTempo(null, estimate('rbpm', 150), 'single-engine');
    expect(result).toEqual({ bpm: 150, alternativeBpm: null });
  });

  it('throws if neither engine has an estimate (caller must guard against this)', () => {
    expect(() => chooseFinalTempo(null, null, 'conflict')).toThrow();
  });
});
