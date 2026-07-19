export interface PendulumConfig {
  pivotX: number;
  pivotY: number;
  armLength: number;
}

export interface PendulumPoint {
  x: number;
  y: number;
}

/**
 * The line endpoint and the bob's local center (before the shared rotation
 * transform is applied) must be the exact same point, computed once, so the
 * two can never drift apart regardless of shape size, first-beat emphasis,
 * or visual scale — all of which are applied on layers nested *inside* this
 * shared point, never on the point itself.
 */
export function computePendulumConnectionPoint(config: PendulumConfig): PendulumPoint {
  return { x: config.pivotX, y: config.pivotY + config.armLength };
}

export const SWING_MAX_ANGLE_DEG = 52;

/** Linear interpolation of swing angle across a beat's progress [0, 1]. */
export function swingAngleDegForProgress(progress: number, maxAngleDeg: number = SWING_MAX_ANGLE_DEG): number {
  return -maxAngleDeg + progress * (2 * maxAngleDeg);
}
