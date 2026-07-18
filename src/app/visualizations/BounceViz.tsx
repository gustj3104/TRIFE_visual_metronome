import { useEffect, useMemo, useRef } from 'react';
import { EMPHASIS_EASE_IN, EMPHASIS_EASE_OUT, FIRST_BEAT_EMPHASIS_DURATION_MS, NORMAL_BEAT_EMPHASIS_DURATION_MS, REDUCED_MOTION_EMPHASIS_FACTOR } from '../metronome/constants';
import type { Direction, Status } from '../metronome/types';
import { useBeatEmphasis } from './useBeatEmphasis';
import { usePositionAnimation } from './usePositionAnimation';

const SP = 0.17;
const EP = 0.83;
const BASE_R = 50;
const REST_LINE_WIDTH = 1.5;
const SCALES = { normal: 1.18, first: 1.38 };
const LINE_WIDTHS = { normal: 2.5, first: 4 };

interface BounceVizProps {
  direction: Direction;
  fg: string;
  status: Status;
  bpm: number;
  currentBeat: number;
  isFirstBeat: boolean;
  firstBeatEmphasis: boolean;
  getElapsedBeats: () => number;
  reducedMotion: boolean;
}

export function BounceViz({
  direction, fg, status, bpm, currentBeat, isFirstBeat, firstBeatEmphasis, getElapsedBeats, reducedMotion,
}: BounceVizProps) {
  const keyframes = useMemo<Keyframe[]>(() => (
    direction === 'Vertical'
      ? [{ transform: `translate(500px, ${1000 * SP}px)` }, { transform: `translate(500px, ${1000 * EP}px)` }]
      : [{ transform: `translate(${1000 * SP}px, 500px)` }, { transform: `translate(${1000 * EP}px, 500px)` }]
  ), [direction]);

  const posRef = usePositionAnimation({
    status, bpm, keyframes, idleTransform: 'translate(500px, 500px)', getElapsedBeats,
  });

  const scaleRef = useBeatEmphasis({
    status, currentBeat, isFirstBeat, firstBeatEmphasis, scales: SCALES,
  });

  const lineARef = useRef<SVGLineElement>(null);
  const lineBRef = useRef<SVGLineElement>(null);
  const lineAnimRefA = useRef<Animation | null>(null);
  const lineAnimRefB = useRef<Animation | null>(null);

  useEffect(() => {
    if (status !== 'Playing') return;
    const useFirst = isFirstBeat && firstBeatEmphasis;
    const rawPeak = useFirst ? LINE_WIDTHS.first : LINE_WIDTHS.normal;
    const peak = reducedMotion ? REST_LINE_WIDTH + (rawPeak - REST_LINE_WIDTH) * REDUCED_MOTION_EMPHASIS_FACTOR : rawPeak;
    const duration = useFirst ? FIRST_BEAT_EMPHASIS_DURATION_MS : NORMAL_BEAT_EMPHASIS_DURATION_MS;
    const keyframesFor = [
      { strokeWidth: String(REST_LINE_WIDTH), easing: EMPHASIS_EASE_IN },
      { strokeWidth: String(peak), easing: EMPHASIS_EASE_OUT },
      { strokeWidth: String(REST_LINE_WIDTH) },
    ];
    lineAnimRefA.current?.cancel();
    lineAnimRefB.current?.cancel();
    if (lineARef.current) lineAnimRefA.current = lineARef.current.animate(keyframesFor, { duration, fill: 'none' });
    if (lineBRef.current) lineAnimRefB.current = lineBRef.current.animate(keyframesFor, { duration, fill: 'none' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentBeat]);

  useEffect(() => () => {
    lineAnimRefA.current?.cancel();
    lineAnimRefB.current?.cancel();
  }, []);

  let gx1: number, gy1: number, gx2: number, gy2: number;
  let r1x1: number, r1y1: number, r1x2: number, r1y2: number;
  let r2x1: number, r2y1: number, r2x2: number, r2y2: number;

  if (direction === 'Vertical') {
    gx1 = 500; gy1 = 1000 * SP; gx2 = 500; gy2 = 1000 * EP;
    r1x1 = 350; r1y1 = 1000 * SP; r1x2 = 650; r1y2 = 1000 * SP;
    r2x1 = 350; r2y1 = 1000 * EP; r2x2 = 650; r2y2 = 1000 * EP;
  } else {
    gx1 = 1000 * SP; gy1 = 500; gx2 = 1000 * EP; gy2 = 500;
    r1x1 = 1000 * SP; r1y1 = 350; r1x2 = 1000 * SP; r1y2 = 650;
    r2x1 = 1000 * EP; r2y1 = 350; r2x2 = 1000 * EP; r2y2 = 650;
  }

  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
      <line x1={gx1} y1={gy1} x2={gx2} y2={gy2} stroke={fg} strokeWidth={0.5} strokeOpacity={0.06} />
      <line ref={lineARef} x1={r1x1} y1={r1y1} x2={r1x2} y2={r1y2} stroke={fg} strokeWidth={REST_LINE_WIDTH} strokeOpacity={0.28} strokeLinecap="round" />
      <line ref={lineBRef} x1={r2x1} y1={r2y1} x2={r2x2} y2={r2y2} stroke={fg} strokeWidth={REST_LINE_WIDTH} strokeOpacity={0.28} strokeLinecap="round" />
      <g ref={posRef} data-testid="bounce-translate-wrapper">
        <g ref={scaleRef} data-testid="bounce-scale-wrapper">
          <circle r={BASE_R} fill={fg} />
        </g>
      </g>
    </svg>
  );
}
