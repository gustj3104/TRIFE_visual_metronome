import { describe, expect, it } from 'vitest';
import { clampBpm, resolveBpmCommit } from '../../src/app/lib/bpmInput';

describe('clampBpm', () => {
  it('keeps in-range integers unchanged', () => {
    expect(clampBpm(120)).toBe(120);
  });

  it('clamps below the minimum up to 40', () => {
    expect(clampBpm(39)).toBe(40);
  });

  it('clamps above the maximum down to 240', () => {
    expect(clampBpm(241)).toBe(240);
  });

  it('rounds decimals to the nearest integer', () => {
    expect(clampBpm(120.6)).toBe(121);
    expect(clampBpm(120.4)).toBe(120);
  });
});

describe('resolveBpmCommit', () => {
  it('accepts a valid in-range value', () => {
    expect(resolveBpmCommit('180', 120)).toBe(180);
  });

  it('clamps 39 up to 40 and 241 down to 240', () => {
    expect(resolveBpmCommit('39', 120)).toBe(40);
    expect(resolveBpmCommit('241', 120)).toBe(240);
  });

  it('rounds a decimal input', () => {
    expect(resolveBpmCommit('99.6', 120)).toBe(100);
  });

  it('restores the previous BPM for an empty draft', () => {
    expect(resolveBpmCommit('', 120)).toBe(120);
    expect(resolveBpmCommit('   ', 120)).toBe(120);
  });

  it('restores the previous BPM for a non-numeric draft', () => {
    expect(resolveBpmCommit('abc', 150)).toBe(150);
  });
});
