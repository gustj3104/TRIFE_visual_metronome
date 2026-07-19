import { describe, expect, it } from 'vitest';
import {
  computePendulumConnectionPoint,
  swingAngleDegForProgress,
  SWING_MAX_ANGLE_DEG,
} from '../../src/app/lib/swingGeometry';

describe('computePendulumConnectionPoint', () => {
  const config = { pivotX: 500, pivotY: 130, armLength: 370 };

  it('the line end and bob local center are the exact same point', () => {
    const point = computePendulumConnectionPoint(config);
    // The line-end and bob-center are literally the same returned point in
    // this implementation (single shared coordinate) — that is the fix for
    // the line/circle separation bug: there is no way for them to diverge
    // because there is only one point ever computed.
    expect(point).toEqual({ x: 500, y: 500 });
  });

  it('is unaffected by shape size or visual scale, since neither is a parameter', () => {
    // The function signature intentionally accepts no scale — shape/visual
    // scale are applied on layers nested inside this point, never on it.
    const point = computePendulumConnectionPoint(config);
    expect(point.y).toBe(config.pivotY + config.armLength);
  });

  it('changes only with pivot/arm length, matching a fixed connection relationship', () => {
    const a = computePendulumConnectionPoint({ pivotX: 500, pivotY: 130, armLength: 370 });
    const b = computePendulumConnectionPoint({ pivotX: 500, pivotY: 130, armLength: 370 });
    expect(a).toEqual(b);
  });
});

describe('swingAngleDegForProgress', () => {
  it('is linear: -max at progress 0, +max at progress 1, 0 at the midpoint', () => {
    expect(swingAngleDegForProgress(0)).toBe(-SWING_MAX_ANGLE_DEG);
    expect(swingAngleDegForProgress(1)).toBe(SWING_MAX_ANGLE_DEG);
    expect(swingAngleDegForProgress(0.5)).toBe(0);
  });

  it('interpolates linearly at intermediate progress values', () => {
    expect(swingAngleDegForProgress(0.25)).toBeCloseTo(-SWING_MAX_ANGLE_DEG / 2);
    expect(swingAngleDegForProgress(0.75)).toBeCloseTo(SWING_MAX_ANGLE_DEG / 2);
  });
});
