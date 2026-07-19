import type { Status } from '../engine/types';

export function getCtaLabel(status: Status): 'START' | 'PAUSE' | 'RESTART' {
  if (status === 'Playing') return 'PAUSE';
  if (status === 'Paused') return 'RESTART';
  return 'START';
}

export function getCtaAriaLabel(status: Status): string {
  if (status === 'Playing') return 'Pause metronome';
  if (status === 'Paused') return 'Restart from count 1';
  return 'Start metronome';
}
