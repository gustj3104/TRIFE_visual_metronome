import { describe, expect, it } from 'vitest';
import { LiveEnsembleStabilizer, type LiveEngineSample } from '../../src/app/audio/ensemble/liveEnsembleStabilizer';
import { MEDIUM_CONFIDENCE_NUMBER } from '../../src/app/audio/ensemble/constants';
import type { EngineTempoEstimate } from '../../src/app/audio/ensemble/types';

/** Past MIN_ELAPSED_MS_BEFORE_LOCK (12s) — most tests aren't specifically about the elapsed-time floor. */
const PAST_FLOOR_MS = 20_000;

function sample(engine: 'custom' | 'rbpm', bpm: number, isEngineStable: boolean): LiveEngineSample {
  const estimate: EngineTempoEstimate = {
    engine,
    bpm,
    rawCandidates: [{ bpm, count: 10, confidence: 0.9 }],
    dominance: 0.9,
    sampleCount: 10,
    analyzedDurationSeconds: 10,
  };
  return { estimate, isEngineStable };
}

describe('LiveEnsembleStabilizer', () => {
  it('near: does not lock on a single agreeing-but-not-yet-repeated tick', () => {
    const s = new LiveEnsembleStabilizer();
    const out = s.update({
      custom: sample('custom', 128, true),
      rbpm: sample('rbpm', 127, true),
      currentAppliedBpm: null,
      elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok',
    });
    expect(out.phase).toBe('stabilizing');
  });

  it('near: locks once both engines are stable AND the ensemble ticks have repeated AND past the elapsed-time floor', () => {
    const s = new LiveEnsembleStabilizer();
    s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, true), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
    const out = s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, true), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
    expect(out.phase).toBe('success');
    if (out.phase === 'success') {
      expect(out.result.bpm).toBe(128);
      expect(out.result.engine).toBe('ensemble');
      expect(out.result.confidence).toBeGreaterThanOrEqual(0.8); // near + solid + repeated -> high
    }
  });

  it('near: does not lock before the elapsed-time floor, even with both engines stable and repeated', () => {
    // The custom engine's own gate can fire in ~6s — this floor is what
    // stops an ensemble lock from firing that fast in practice.
    const s = new LiveEnsembleStabilizer();
    s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, true), currentAppliedBpm: null, elapsedMs: 6_000, signalQuality: 'ok' });
    const out = s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, true), currentAppliedBpm: null, elapsedMs: 6_000, signalQuality: 'ok' });
    expect(out.phase).toBe('stabilizing');
  });

  it('near: does not lock while only ONE engine has reached its own stable signal — both must be stable, not just the faster one', () => {
    const s = new LiveEnsembleStabilizer();
    s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, false), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
    const out = s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, false), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
    expect(out.phase).toBe('stabilizing');
  });

  it('near: does not lock while neither engine has reached its own stable signal, even after repeats', () => {
    const s = new LiveEnsembleStabilizer();
    s.update({ custom: sample('custom', 128, false), rbpm: sample('rbpm', 127, false), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
    const out = s.update({ custom: sample('custom', 128, false), rbpm: sample('rbpm', 127, false), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
    expect(out.phase).toBe('stabilizing');
  });

  it('conflict: never locks, regardless of repetition or engine stability', () => {
    const s = new LiveEnsembleStabilizer();
    for (let i = 0; i < 5; i++) {
      const out = s.update({ custom: sample('custom', 103, true), rbpm: sample('rbpm', 128, true), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
      expect(out.phase).toBe('stabilizing');
      if (out.phase === 'stabilizing') expect(out.candidateBpm).toBeNull();
    }
  });

  it('half-double: requires matching the currently-applied BPM family AND more repeats than near', () => {
    const s = new LiveEnsembleStabilizer();
    // custom=128, rbpm=64 -> half-double; currentAppliedBpm=64 matches rbpm's family.
    const tick = () =>
      s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 64, true), currentAppliedBpm: 64, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });

    expect(tick().phase).toBe('stabilizing');
    expect(tick().phase).toBe('stabilizing'); // 2 repeats is enough for near, but not for half-double
    const third = tick();
    expect(third.phase).toBe('success');
    if (third.phase === 'success') {
      expect(third.result.alternativeBpm).toBe(64);
      expect(third.result.confidence).toBeLessThan(0.8); // half-double never reaches high
    }
  });

  it('half-double: does not lock when the candidate matches neither the locked nor the currently-applied family', () => {
    const s = new LiveEnsembleStabilizer();
    for (let i = 0; i < 5; i++) {
      const out = s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 64, true), currentAppliedBpm: 100, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
      expect(out.phase).toBe('stabilizing');
    }
  });

  it('single-engine fallback (rbpm unavailable): custom stable + past the elapsed floor + signal ok -> locks at exactly Medium — the AND gate in updateBothEngines does NOT apply here, only the one available engine is required to be stable', () => {
    const s = new LiveEnsembleStabilizer();
    s.update({ custom: sample('custom', 120, true), rbpm: null, currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
    const out = s.update({ custom: sample('custom', 120, true), rbpm: null, currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
    expect(out.phase).toBe('success');
    if (out.phase === 'success') {
      expect(out.result.engine).toBe('custom');
      expect(out.result.bpm).toBe(120);
      expect(out.result.confidence).toBe(MEDIUM_CONFIDENCE_NUMBER); // exactly Medium, never High, for single-engine
    }
  });

  it('single-engine: does not lock before the elapsed-time floor even when its own gate and repeats are satisfied', () => {
    const s = new LiveEnsembleStabilizer();
    s.update({ custom: sample('custom', 120, true), rbpm: null, currentAppliedBpm: null, elapsedMs: 6_000, signalQuality: 'ok' });
    const out = s.update({ custom: sample('custom', 120, true), rbpm: null, currentAppliedBpm: null, elapsedMs: 6_000, signalQuality: 'ok' });
    expect(out.phase).toBe('stabilizing');
  });

  it('returns listening when neither engine has produced anything yet', () => {
    const s = new LiveEnsembleStabilizer();
    const out = s.update({ custom: null, rbpm: null, currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
    expect(out).toEqual({ phase: 'listening', candidateBpm: null });
  });

  it('near: does not lock while signal quality is "too-quiet", even with both engines stable and repeated past the floor', () => {
    const s = new LiveEnsembleStabilizer();
    s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, true), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'too-quiet' });
    const out = s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, true), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'too-quiet' });
    expect(out.phase).toBe('stabilizing');
  });

  it('near: does not lock while signal quality is "too-loud"', () => {
    const s = new LiveEnsembleStabilizer();
    s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, true), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'too-loud' });
    const out = s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, true), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'too-loud' });
    expect(out.phase).toBe('stabilizing');
  });

  it('near: locks once signal quality recovers to "ok" (a prior bad-quality tick still contributed to the repeat count)', () => {
    const s = new LiveEnsembleStabilizer();
    s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, true), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'too-quiet' });
    const out = s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, true), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
    expect(out.phase).toBe('success');
  });

  it('reset() clears history so a fresh session does not inherit prior repeats', () => {
    const s = new LiveEnsembleStabilizer();
    s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, true), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
    s.reset();
    const out = s.update({ custom: sample('custom', 128, true), rbpm: sample('rbpm', 127, true), currentAppliedBpm: null, elapsedMs: PAST_FLOOR_MS, signalQuality: 'ok' });
    expect(out.phase).toBe('stabilizing');
  });
});
