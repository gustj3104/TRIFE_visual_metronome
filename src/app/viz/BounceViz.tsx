import { useRef } from 'react';
import type { MetronomeEngine } from '../engine/useMetronomeEngine';
import { usePhaseAnimation } from '../engine/usePhaseAnimation';
import { useBeatEmphasis } from '../hooks/useBeatEmphasis';
import type { Direction } from '../engine/types';
import { CENTER, VIEWBOX, px } from './vizCommon';

const SP = 0.17;
const EP = 0.83;
const BASE_RADIUS = 50;
const EMPHASIS_PEAK_SCALE = 1.38;

interface BounceVizProps {
  engine: MetronomeEngine;
  direction: Direction;
  fg: string;
  visualScale: number;
  shapeScale: number;
  firstBeatEmphasisEnabled: boolean;
}

export function BounceViz({ engine, direction, fg, visualScale, shapeScale, firstBeatEmphasisEnabled }: BounceVizProps) {
  const positionRef = useRef<SVGGElement>(null);
  const emphasisRef = useRef<SVGGElement>(null);
  const active = engine.status !== 'Ready';

  const startPos = VIEWBOX * SP;
  const endPos = VIEWBOX * EP;

  usePhaseAnimation(
    positionRef,
    engine,
    active,
    {
      buildKeyframes: () =>
        direction === 'Vertical'
          ? [{ transform: `translate(${px(CENTER)}, ${px(startPos)})` }, { transform: `translate(${px(CENTER)}, ${px(endPos)})` }]
          : [{ transform: `translate(${px(startPos)}, ${px(CENTER)})` }, { transform: `translate(${px(endPos)}, ${px(CENTER)})` }],
    },
    [direction],
  );

  const emphasisState = useBeatEmphasis(emphasisRef, engine, firstBeatEmphasisEnabled, {
    buildKeyframes: () => [{ transform: 'scale(1)' }, { transform: `scale(${EMPHASIS_PEAK_SCALE})` }, { transform: 'scale(1)' }],
  });

  const guideLines =
    direction === 'Vertical'
      ? {
          track: { x1: CENTER, y1: startPos, x2: CENTER, y2: endPos },
          rail1: { x1: 350, y1: startPos, x2: 650, y2: startPos },
          rail2: { x1: 350, y1: endPos, x2: 650, y2: endPos },
        }
      : {
          track: { x1: startPos, y1: CENTER, x2: endPos, y2: CENTER },
          rail1: { x1: startPos, y1: 350, x2: startPos, y2: 650 },
          rail2: { x1: endPos, y1: 350, x2: endPos, y2: 650 },
        };

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} preserveAspectRatio="xMidYMid meet" data-viz="Bounce">
      <g
        className="visual-size-wrapper"
        style={{ transform: `translate(${px(CENTER)}, ${px(CENTER)}) scale(${visualScale}) translate(${px(-CENTER)}, ${px(-CENTER)})` }}
      >
        <line {...guideLines.track} stroke={fg} strokeWidth={0.5} strokeOpacity={0.06} />
        <line {...guideLines.rail1} stroke={fg} strokeWidth={1.5} strokeOpacity={0.28} strokeLinecap="round" />
        <line {...guideLines.rail2} stroke={fg} strokeWidth={1.5} strokeOpacity={0.28} strokeLinecap="round" />
        <g
          ref={positionRef}
          className="position-wrapper"
          style={!active ? { transform: `translate(${px(CENTER)}, ${px(CENTER)})` } : undefined}
        >
          <g className="shape-size-wrapper" style={{ transform: `scale(${shapeScale})` }}>
            <g ref={emphasisRef} className="emphasis-wrapper" data-testid="emphasis-wrapper" data-emphasis-state={emphasisState}>
              <circle r={BASE_RADIUS} fill={fg} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
