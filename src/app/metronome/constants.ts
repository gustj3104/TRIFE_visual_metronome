import type { CountMode } from './types';

export const BPM_MIN = 40;
export const BPM_MAX = 240;

/** Reference BPM every WAAPI position animation is authored at; actual BPM is applied via `playbackRate`. */
export const BASE_BPM = 120;

export const COUNT_TOTALS: Record<CountMode, number> = {
  '4/4': 4,
  '8count': 8,
};

/** Beat-emphasis (scale pulse) durations, in ms - independent of BPM. */
export const NORMAL_BEAT_EMPHASIS_DURATION_MS = 180;
export const FIRST_BEAT_EMPHASIS_DURATION_MS = 260;

/** Punch-in / ease-out easing used for every beat-emphasis animation. */
export const EMPHASIS_EASE_IN = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
export const EMPHASIS_EASE_OUT = 'ease-in';

/** How much beat-emphasis scale intensity is kept under prefers-reduced-motion (0..1). */
export const REDUCED_MOTION_EMPHASIS_FACTOR = 0.4;
