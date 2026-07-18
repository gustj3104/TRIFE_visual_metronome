import { useMemo } from 'react';
import type { Status } from '../metronome/types';
import { useBeatEmphasis } from './useBeatEmphasis';
import { usePositionAnimation } from './usePositionAnimation';

const PIVOT_X = 500;
const PIVOT_Y = 130;
const ARM_LENGTH = 370;
const MAX_ANGLE_RAD = (52 * Math.PI) / 180;
const MAX_ANGLE_DEG = 52;
const SCALES = { normal: 1.18, first: 1.35 };
const SAMPLE_COUNT = 16;

function pendulumEase(t: number): number {
  return Math.sin(t * Math.PI - Math.PI / 2);
}

function pointAtAngle(angleRad: number): { x: number; y: number } {
  return {
    x: PIVOT_X + ARM_LENGTH * Math.sin(angleRad),
    y: PIVOT_Y + ARM_LENGTH * Math.cos(angleRad),
  };
}

/** Sample offsets (0..1) shared by the ball's translate keyframes and the
 * rod's rotate keyframes, so both trace the same sine-eased pendulum swing
 * and stay in lockstep every beat. */
const SAMPLE_OFFSETS = Array.from({ length: SAMPLE_COUNT + 1 }, (_, i) => i / SAMPLE_COUNT);

function buildBallKeyframes(): Keyframe[] {
  return SAMPLE_OFFSETS.map((t) => {
    const angle = pendulumEase(t) * MAX_ANGLE_RAD;
    const { x, y } = pointAtAngle(angle);
    return { transform: `translate(${x}px, ${y}px)`, offset: t };
  });
}

function buildRodKeyframes(): Keyframe[] {
  return SAMPLE_OFFSETS.map((t) => {
    const angleDeg = pendulumEase(t) * MAX_ANGLE_DEG;
    return { transform: `translate(${PIVOT_X}px, ${PIVOT_Y}px) rotate(${angleDeg}deg)`, offset: t };
  });
}

interface SwingVizProps {
  fg: string;
  status: Status;
  bpm: number;
  currentBeat: number;
  isFirstBeat: boolean;
  firstBeatEmphasis: boolean;
  getElapsedBeats: () => number;
}

export function SwingViz({ fg, status, bpm, currentBeat, isFirstBeat, firstBeatEmphasis, getElapsedBeats }: SwingVizProps) {
  const ballKeyframes = useMemo(buildBallKeyframes, []);
  const rodKeyframes = useMemo(buildRodKeyframes, []);
  const rest = pointAtAngle(0);

  const ballPosRef = usePositionAnimation({
    status, bpm, keyframes: ballKeyframes, idleTransform: `translate(${rest.x}px, ${rest.y}px)`, getElapsedBeats,
  });
  const rodRef = usePositionAnimation({
    status, bpm, keyframes: rodKeyframes, idleTransform: `translate(${PIVOT_X}px, ${PIVOT_Y}px) rotate(0deg)`, getElapsedBeats,
  });

  const scaleRef = useBeatEmphasis({ status, currentBeat, isFirstBeat, firstBeatEmphasis, scales: SCALES });

  const start = pointAtAngle(-MAX_ANGLE_RAD);
  const end = pointAtAngle(MAX_ANGLE_RAD);

  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
      <path
        d={`M ${start.x} ${start.y} A ${ARM_LENGTH} ${ARM_LENGTH} 0 0 1 ${end.x} ${end.y}`}
        fill="none" stroke={fg} strokeWidth={0.5} strokeOpacity={0.09}
      />
      <circle cx={start.x} cy={start.y} r={7} fill={fg} fillOpacity={0.18} />
      <circle cx={end.x} cy={end.y} r={7} fill={fg} fillOpacity={0.18} />
      <circle cx={PIVOT_X} cy={PIVOT_Y} r={7} fill={fg} fillOpacity={0.4} />
      <g ref={rodRef} data-testid="swing-rod-wrapper">
        <line x1={0} y1={0} x2={0} y2={ARM_LENGTH} stroke={fg} strokeWidth={2} strokeOpacity={0.22} />
      </g>
      <g ref={ballPosRef} data-testid="swing-translate-wrapper">
        <g ref={scaleRef} data-testid="swing-scale-wrapper">
          <circle r={52} fill={fg} />
        </g>
      </g>
    </svg>
  );
}
