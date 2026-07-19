import { useRef } from 'react';
import type { MetronomeEngine } from '../engine/useMetronomeEngine';
import { usePhaseAnimation } from '../engine/usePhaseAnimation';
import { useBeatEmphasis } from '../hooks/useBeatEmphasis';
import { CENTER, VIEWBOX, px } from './vizCommon';

const RING_BASE_RADIUS = 60;
const RING_MAX_RADIUS = 310;
const RING_SCALE = RING_MAX_RADIUS / RING_BASE_RADIUS;
const CORE_RADIUS = 55;
const EMPHASIS_PEAK_SCALE = 1.48;

interface PulseVizProps {
  engine: MetronomeEngine;
  fg: string;
  visualScale: number;
  shapeScale: number;
  firstBeatEmphasisEnabled: boolean;
}

export function PulseViz({ engine, fg, visualScale, shapeScale, firstBeatEmphasisEnabled }: PulseVizProps) {
  const ring1Ref = useRef<SVGGElement>(null);
  const ring2Ref = useRef<SVGGElement>(null);
  const emphasisRef = useRef<SVGGElement>(null);
  const active = engine.status !== 'Ready';

  usePhaseAnimation(
    ring1Ref,
    engine,
    active,
    {
      direction: 'normal',
      buildKeyframes: () => [
        { transform: 'scale(1)', opacity: 0.6, offset: 0 },
        { transform: `scale(${RING_SCALE})`, opacity: 0, offset: 1 },
      ],
    },
    [],
  );

  usePhaseAnimation(
    ring2Ref,
    engine,
    active,
    {
      direction: 'normal',
      buildKeyframes: () => [
        { transform: 'scale(1)', opacity: 0, offset: 0 },
        { transform: 'scale(1)', opacity: 0.3, offset: 0.4 },
        { transform: `scale(${RING_SCALE})`, opacity: 0, offset: 1 },
      ],
    },
    [],
  );

  const emphasisState = useBeatEmphasis(emphasisRef, engine, firstBeatEmphasisEnabled, {
    buildKeyframes: () => [{ transform: 'scale(1)' }, { transform: `scale(${EMPHASIS_PEAK_SCALE})` }, { transform: 'scale(1)' }],
  });

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} preserveAspectRatio="xMidYMid meet" data-viz="Pulse">
      <g
        className="visual-size-wrapper"
        style={{ transform: `translate(${px(CENTER)}, ${px(CENTER)}) scale(${visualScale}) translate(${px(-CENTER)}, ${px(-CENTER)})` }}
      >
        <g style={{ transform: `translate(${px(CENTER)}, ${px(CENTER)})` }}>
          <g ref={ring1Ref} className="pulse-ring" style={active ? undefined : { opacity: 0 }}>
            <circle r={RING_BASE_RADIUS} fill="none" stroke={fg} strokeWidth={2.5} />
          </g>
          <g ref={ring2Ref} className="pulse-ring-trailing" style={active ? undefined : { opacity: 0 }}>
            <circle r={RING_BASE_RADIUS} fill="none" stroke={fg} strokeWidth={1.5} />
          </g>
        </g>
        <g style={{ transform: `translate(${px(CENTER)}, ${px(CENTER)})` }}>
          <g className="shape-size-wrapper" style={{ transform: `scale(${shapeScale})` }}>
            <g ref={emphasisRef} className="emphasis-wrapper" data-testid="emphasis-wrapper" data-emphasis-state={emphasisState}>
              <circle r={CORE_RADIUS} fill={fg} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
