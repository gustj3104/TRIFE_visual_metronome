import { BASE_BPM, BPM_MAX, BPM_MIN, COUNT_TOTALS } from './constants';
import type { AnchorState, BeatPhase, CountMode } from './types';

/** Real-world duration of one beat (one endpoint-to-endpoint traversal) at the given BPM. */
export function bpmToBeatDurationMs(bpm: number): number {
  return 60000 / bpm;
}

export function clampBpm(value: number): number {
  return Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(value)));
}

/** WAAPI `playbackRate` that makes a BASE_BPM-authored animation run at `bpm`. */
export function computePlaybackRate(bpm: number, baseBpm: number = BASE_BPM): number {
  return bpm / baseBpm;
}

export function countTotalFor(countMode: CountMode): number {
  return COUNT_TOTALS[countMode];
}

/**
 * Continuous elapsed-beats value (not modulo) at `nowMs`, given an anchor
 * established at `anchor.anchorTimeMs` with `anchor.anchorBeats` already
 * elapsed at that moment, running at `anchor.bpm`. Monotonic, time-based -
 * correct even after long gaps (e.g. a backgrounded tab) since it always
 * re-derives from real elapsed time rather than accumulating tick counts.
 */
export function computeElapsedBeats(anchor: AnchorState, nowMs: number): number {
  const beatDuration = bpmToBeatDurationMs(anchor.bpm);
  return anchor.anchorBeats + (nowMs - anchor.anchorTimeMs) / beatDuration;
}

export function computeBeatIndex(elapsedBeats: number, total: number): number {
  const whole = Math.floor(elapsedBeats + 1e-9);
  return ((whole % total) + total) % total;
}

export function computeIsFirstBeat(beatIndex: number): boolean {
  return beatIndex === 0;
}

export function computeFraction(elapsedBeats: number): number {
  const whole = Math.floor(elapsedBeats + 1e-9);
  return elapsedBeats - whole;
}

export function computeGoingForward(elapsedBeats: number): boolean {
  const whole = Math.floor(elapsedBeats + 1e-9);
  return whole % 2 === 0;
}

/** Full phase snapshot at `nowMs` for the given anchor and count mode. */
export function computeBeatPhase(anchor: AnchorState, countMode: CountMode, nowMs: number): BeatPhase {
  const elapsedBeats = computeElapsedBeats(anchor, nowMs);
  const total = countTotalFor(countMode);
  const beatIndex = computeBeatIndex(elapsedBeats, total);
  return {
    elapsedBeats,
    beatIndex,
    isFirstBeat: computeIsFirstBeat(beatIndex),
    fraction: computeFraction(elapsedBeats),
    goingForward: computeGoingForward(elapsedBeats),
  };
}

/**
 * Rebase the anchor to a new BPM while preserving continuity: the
 * continuous elapsed-beats value (and therefore visual/count phase) at the
 * moment of the change is baked into the new anchor, so nothing jumps.
 */
export function rebaseAnchorForBpm(anchor: AnchorState, nowMs: number, newBpm: number): AnchorState {
  return {
    anchorTimeMs: nowMs,
    anchorBeats: computeElapsedBeats(anchor, nowMs),
    bpm: newBpm,
  };
}

/** Milliseconds from `nowMs` until the next whole-beat boundary is crossed. */
export function msUntilNextBeatBoundary(anchor: AnchorState, nowMs: number): number {
  const elapsedBeats = computeElapsedBeats(anchor, nowMs);
  const nextBoundaryBeats = Math.floor(elapsedBeats + 1e-9) + 1;
  const beatDuration = bpmToBeatDurationMs(anchor.bpm);
  const nextBoundaryTimeMs = anchor.anchorTimeMs + (nextBoundaryBeats - anchor.anchorBeats) * beatDuration;
  return Math.max(0, nextBoundaryTimeMs - nowMs);
}

/**
 * WAAPI `currentTime` (in the animation's own BASE_BPM-authored timeline) that
 * corresponds to a given continuous elapsed-beats value. Used to seed a
 * freshly-created position Animation so it continues in phase rather than
 * snapping back to its start.
 */
export function elapsedBeatsToBaseCurrentTimeMs(elapsedBeats: number): number {
  return elapsedBeats * bpmToBeatDurationMs(BASE_BPM);
}
