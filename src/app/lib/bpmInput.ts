import { BPM_MAX, BPM_MIN } from '../engine/types';

export function clampBpm(value: number): number {
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(value)));
}

/**
 * Resolves the value to commit when a BPM edit field is confirmed
 * (Enter/blur). An empty or non-numeric draft restores the previous BPM
 * instead of being treated as zero.
 */
export function resolveBpmCommit(raw: string, previous: number): number {
  const trimmed = raw.trim();
  if (trimmed === '') return previous;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return previous;
  return clampBpm(parsed);
}
