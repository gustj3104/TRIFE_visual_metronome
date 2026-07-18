import { useMemo } from 'react';
import type { Status } from '../metronome/types';
import { useBeatEmphasis } from './useBeatEmphasis';
import { usePositionAnimation } from './usePositionAnimation';

const TRACK_START = 120;
const TRACK_END = 880;
const BASE_WIDTH = 5;
const BAR_HEIGHT = 690;
// Expressed as scaleX ratios relative to BASE_WIDTH, matching the product's original 8/12px widths.
const SCALES = { normal: 8 / BASE_WIDTH, first: 12 / BASE_WIDTH };

interface SweepVizProps {
  fg: string;
  status: Status;
  bpm: number;
  currentBeat: number;
  isFirstBeat: boolean;
  firstBeatEmphasis: boolean;
  getElapsedBeats: () => number;
}

export function SweepViz({ fg, status, bpm, currentBeat, isFirstBeat, firstBeatEmphasis, getElapsedBeats }: SweepVizProps) {
  const keyframes = useMemo<Keyframe[]>(() => [
    { transform: `translate(${TRACK_START}px, 500px)` },
    { transform: `translate(${TRACK_END}px, 500px)` },
  ], []);

  const posRef = usePositionAnimation({
    status, bpm, keyframes, idleTransform: 'translate(500px, 500px)', getElapsedBeats,
  });

  const scaleRef = useBeatEmphasis({
    status, currentBeat, isFirstBeat, firstBeatEmphasis, scales: SCALES,
    toTransform: (s) => `scaleX(${s})`,
  });

  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
      <line x1={TRACK_START} y1={175} x2={TRACK_START} y2={825} stroke={fg} strokeWidth={1} strokeOpacity={0.15} />
      <line x1={TRACK_END} y1={175} x2={TRACK_END} y2={825} stroke={fg} strokeWidth={1} strokeOpacity={0.15} />
      <line x1={TRACK_START} y1={500} x2={TRACK_END} y2={500} stroke={fg} strokeWidth={0.5} strokeOpacity={0.06} />
      <g ref={posRef} data-testid="sweep-translate-wrapper">
        <g ref={scaleRef} data-testid="sweep-scale-wrapper">
          <rect x={-BASE_WIDTH / 2} y={-BAR_HEIGHT / 2} width={BASE_WIDTH} height={BAR_HEIGHT} fill={fg} rx={BASE_WIDTH / 2} />
        </g>
      </g>
    </svg>
  );
}
