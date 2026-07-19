import {
  SHAPE_SCALE_MAX,
  SHAPE_SCALE_MIN,
  VISUAL_SCALE_MAX,
  VISUAL_SCALE_MIN,
} from '../engine/types';

export function clampVisualScale(value: number): number {
  return Math.min(VISUAL_SCALE_MAX, Math.max(VISUAL_SCALE_MIN, value));
}

export function clampShapeScale(value: number): number {
  return Math.min(SHAPE_SCALE_MAX, Math.max(SHAPE_SCALE_MIN, value));
}

export function formatScalePercent(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
