import { useRef } from 'react';
import type { MetronomeEngine } from '../engine/useMetronomeEngine';
import { usePhaseAnimation } from '../engine/usePhaseAnimation';
import { useBeatEmphasis } from '../hooks/useBeatEmphasis';
import { computePendulumConnectionPoint, SWING_MAX_ANGLE_DEG } from '../lib/swingGeometry';
import { CENTER, VIEWBOX, px } from './vizCommon';

const PIVOT_X = CENTER;
const PIVOT_Y = 130;
const ARM_LENGTH = 370;
const BOB_RADIUS = 52;
const EMPHASIS_PEAK_SCALE = 1.35;

interface SwingVizProps {
  engine: MetronomeEngine;
  fg: string;
  visualScale: number;
  shapeScale: number;
  firstBeatEmphasisEnabled: boolean;
}

export function SwingViz({ engine, fg, visualScale, shapeScale, firstBeatEmphasisEnabled }: SwingVizProps) {
  const rotationRef = useRef<SVGGElement>(null);
  const emphasisRef = useRef<SVGGElement>(null);
  const active = engine.status !== 'Ready';

  const connectionPoint = computePendulumConnectionPoint({ pivotX: PIVOT_X, pivotY: PIVOT_Y, armLength: ARM_LENGTH });

  usePhaseAnimation(
    rotationRef,
    engine,
    active,
    {
      buildKeyframes: () => [
        { transform: `rotate(${-SWING_MAX_ANGLE_DEG}deg)` },
        { transform: `rotate(${SWING_MAX_ANGLE_DEG}deg)` },
      ],
    },
    [],
  );

  const emphasisState = useBeatEmphasis(emphasisRef, engine, firstBeatEmphasisEnabled, {
    buildKeyframes: () => [{ transform: 'scale(1)' }, { transform: `scale(${EMPHASIS_PEAK_SCALE})` }, { transform: 'scale(1)' }],
  });

  const arcRad = (SWING_MAX_ANGLE_DEG * Math.PI) / 180;
  const arcStartX = PIVOT_X - ARM_LENGTH * Math.sin(arcRad);
  const arcStartY = PIVOT_Y + ARM_LENGTH * Math.cos(arcRad);
  const arcEndX = PIVOT_X + ARM_LENGTH * Math.sin(arcRad);
  const arcEndY = arcStartY;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} preserveAspectRatio="xMidYMid meet" data-viz="Swing">
      <g
        className="visual-size-wrapper"
        style={{ transform: `translate(${px(CENTER)}, ${px(CENTER)}) scale(${visualScale}) translate(${px(-CENTER)}, ${px(-CENTER)})` }}
      >
        <path
          d={`M ${arcStartX} ${arcStartY} A ${ARM_LENGTH} ${ARM_LENGTH} 0 0 1 ${arcEndX} ${arcEndY}`}
          fill="none"
          stroke={fg}
          strokeWidth={0.5}
          strokeOpacity={0.09}
        />
        <circle cx={arcStartX} cy={arcStartY} r={7} fill={fg} fillOpacity={0.18} />
        <circle cx={arcEndX} cy={arcEndY} r={7} fill={fg} fillOpacity={0.18} />
        <circle cx={PIVOT_X} cy={PIVOT_Y} r={7} fill={fg} fillOpacity={0.4} />

        <g
          ref={rotationRef}
          className="rotation-wrapper"
          style={{
            transformOrigin: `${px(PIVOT_X)} ${px(PIVOT_Y)}`,
            transform: !active ? 'rotate(0deg)' : undefined,
          }}
          data-testid="swing-rotation-wrapper"
        >
          <line
            data-testid="swing-line"
            x1={PIVOT_X}
            y1={PIVOT_Y}
            x2={connectionPoint.x}
            y2={connectionPoint.y}
            stroke={fg}
            strokeWidth={2}
            strokeOpacity={0.22}
          />
          <g style={{ transform: `translate(${px(connectionPoint.x)}, ${px(connectionPoint.y)})` }}>
            <g className="shape-size-wrapper" style={{ transform: `scale(${shapeScale})` }}>
              <g ref={emphasisRef} className="emphasis-wrapper" data-testid="emphasis-wrapper" data-emphasis-state={emphasisState}>
                <circle data-testid="swing-bob" r={BOB_RADIUS} fill={fg} />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
