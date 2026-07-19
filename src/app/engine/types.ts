export type VizType = 'Bounce' | 'Swing' | 'Pulse' | 'Sweep';
export type CountMode = '4/4' | '8count';
export type Direction = 'Vertical' | 'Horizontal';
export type Status = 'Ready' | 'Playing' | 'Paused';
export type StartCount = 'Immediately' | '4count' | '8count' | '5678';

export interface BeatEvent {
  beatIndex: number;
  isFirstBeat: boolean;
  timestamp: number;
}

export type BeatListener = (event: BeatEvent) => void;

export interface VisualSizeSettings {
  visualScale: number;
  shapeScale: number;
}

export const VISUAL_SCALE_MIN = 0.7;
export const VISUAL_SCALE_MAX = 1.3;
export const SHAPE_SCALE_MIN = 0.6;
export const SHAPE_SCALE_MAX = 1.6;
export const SIZE_STEP = 0.05;

export const DEFAULT_VISUAL_SIZE_SETTINGS: VisualSizeSettings = {
  visualScale: 1,
  shapeScale: 1,
};

export const BPM_MIN = 40;
export const BPM_MAX = 240;

export function totalBeatsForMode(mode: CountMode): number {
  return mode === '4/4' ? 4 : 8;
}
