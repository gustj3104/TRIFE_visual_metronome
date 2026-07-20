import { describe, expect, it } from 'vitest';
import { buildTempoFamily, octaveAlign } from '../../src/app/audio/ensemble/tempoAlignment';

describe('octaveAlign', () => {
  it('finds a 0-step alignment for near-identical values', () => {
    expect(octaveAlign(128, 127)).toMatchObject({ steps: 0, diff: 1 });
    expect(octaveAlign(128, 126)).toMatchObject({ steps: 0, diff: 2 });
  });

  it('finds a +1/-1 step alignment for a single octave relationship', () => {
    expect(octaveAlign(64, 128)).toMatchObject({ steps: 1, diff: 0 });
    expect(octaveAlign(128, 64)).toMatchObject({ steps: -1, diff: 0 });
    expect(octaveAlign(75, 150)).toMatchObject({ steps: 1, diff: 0 });
    expect(octaveAlign(70, 140)).toMatchObject({ steps: 1, diff: 0 });
    expect(octaveAlign(100, 200)).toMatchObject({ steps: 1, diff: 0 });
  });

  it('finds a +2 step alignment for a two-octave relationship', () => {
    expect(octaveAlign(60, 240)).toMatchObject({ steps: 2, diff: 0 });
    expect(octaveAlign(45, 180)).toMatchObject({ steps: 2, diff: 0 });
  });

  it('reports a large diff for values with no plausible octave relationship', () => {
    const result = octaveAlign(103, 128);
    expect(result.steps).toBe(0);
    expect(result.diff).toBeGreaterThan(2);
  });

  it('handles non-finite/zero/negative input defensively', () => {
    expect(octaveAlign(NaN, 120).diff).toBe(Infinity);
    expect(octaveAlign(120, NaN).diff).toBe(Infinity);
    expect(octaveAlign(0, 120).diff).toBe(Infinity);
    expect(octaveAlign(-10, 120).diff).toBe(Infinity);
  });
});

describe('buildTempoFamily', () => {
  it('expands a mid-range bpm to all in-range octave relatives', () => {
    expect(buildTempoFamily(120, 40, 240)).toEqual([60, 120, 240]);
  });

  it('produces the same family regardless of which member you start from', () => {
    expect(buildTempoFamily(60, 40, 240)).toEqual([60, 120, 240]);
    expect(buildTempoFamily(240, 40, 240)).toEqual([60, 120, 240]);
  });

  it('stops expanding at the range boundary', () => {
    expect(buildTempoFamily(128, 40, 240)).toEqual([64, 128]);
    expect(buildTempoFamily(75, 40, 240)).toEqual([75, 150]);
  });

  it('folds an out-of-range input into range before expanding', () => {
    // 500 folds down into [40,240] (500 -> 250 -> 125) before family expansion.
    expect(buildTempoFamily(500, 40, 240)).toEqual(buildTempoFamily(125, 40, 240));
  });

  it('returns an empty family for non-finite/zero/negative input', () => {
    expect(buildTempoFamily(NaN)).toEqual([]);
    expect(buildTempoFamily(0)).toEqual([]);
    expect(buildTempoFamily(-5)).toEqual([]);
  });
});
