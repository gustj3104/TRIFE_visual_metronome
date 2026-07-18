export type VizType = 'Bounce' | 'Swing' | 'Pulse' | 'Sweep';
export type CountMode = '4/4' | '8count';
export type Direction = 'Vertical' | 'Horizontal';
export type Status = 'Ready' | 'Playing' | 'Paused';
export type StartCount = 'Immediately' | '4count' | '8count' | '5678';

/**
 * A snapshot of the metronome's continuous timing, derived on demand from a
 * monotonic (performance.now()) anchor. `elapsedBeats` counts whole
 * traversals (ball reaching one endpoint) since play() started and is never
 * reset to a modulo value, so phase math stays correct across BPM changes
 * and after long tab-inactive gaps.
 */
export interface BeatPhase {
  /** Continuous traversal count since play() started (not modulo total). */
  elapsedBeats: number;
  /** 0-based beat index within the current count mode (0..total-1). */
  beatIndex: number;
  /** true when beatIndex === 0. */
  isFirstBeat: boolean;
  /** Fractional progress within the current traversal, 0..1. */
  fraction: number;
  /** true while the ball is conceptually moving start -> end for this traversal. */
  goingForward: boolean;
}

export interface AnchorState {
  /** performance.now() at the moment this anchor was established. */
  anchorTimeMs: number;
  /** Continuous elapsed-beats value at anchorTimeMs. */
  anchorBeats: number;
  /** BPM in effect since this anchor. */
  bpm: number;
}
