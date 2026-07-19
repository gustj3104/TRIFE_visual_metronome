import { useRef } from 'react';
import type { MetronomeEngine } from '../engine/useMetronomeEngine';
import { usePhaseAnimation } from '../engine/usePhaseAnimation';
import { useBeatEmphasis } from '../hooks/useBeatEmphasis';
import { CENTER, VIEWBOX, px } from './vizCommon';

const TRACK_START_X = 120;
const TRACK_END_X = 880;
const BAR_WIDTH = 5;
const BAR_HEIGHT = 690;
const EMPHASIS_PEAK_SCALE = 1.6;

interface SweepVizProps {
  engine: MetronomeEngine;
  fg: string;
  visualScale: number;
  shapeScale: number;
  firstBeatEmphasisEnabled: boolean;
}

export function SweepViz({ engine, fg, visualScale, shapeScale, firstBeatEmphasisEnabled }: SweepVizProps) {
  const positionRef = useRef<SVGGElement>(null);
  const emphasisRef = useRef<SVGGElement>(null);
  const active = engine.status !== 'Ready';

  usePhaseAnimation(
    positionRef,
    engine,
    active,
    {
      buildKeyframes: () => [
        { transform: `translate(${px(TRACK_START_X)}, ${px(CENTER)})` },
        { transform: `translate(${px(TRACK_END_X)}, ${px(CENTER)})` },
      ],
    },
    [],
  );

  const emphasisState = useBeatEmphasis(emphasisRef, engine, firstBeatEmphasisEnabled, {
    buildKeyframes: () => [
      { transform: 'scale(1, 1)' },
      { transform: `scale(${EMPHASIS_PEAK_SCALE}, 1)` },
      { transform: 'scale(1, 1)' },
    ],
  });

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} preserveAspectRatio="xMidYMid meet" data-viz="Sweep">
      <g
        className="visual-size-wrapper"
        style={{ transform: `translate(${px(CENTER)}, ${px(CENTER)}) scale(${visualScale}) translate(${px(-CENTER)}, ${px(-CENTER)})` }}
      >
        <line x1={TRACK_START_X} y1={175} x2={TRACK_START_X} y2={825} stroke={fg} strokeWidth={1} strokeOpacity={0.15} />
        <line x1={TRACK_END_X} y1={175} x2={TRACK_END_X} y2={825} stroke={fg} strokeWidth={1} strokeOpacity={0.15} />
        <line x1={TRACK_START_X} y1={CENTER} x2={TRACK_END_X} y2={CENTER} stroke={fg} strokeWidth={0.5} strokeOpacity={0.06} />

        <g
          ref={positionRef}
          className="position-wrapper"
          style={!active ? { transform: `translate(${px(CENTER)}, ${px(CENTER)})` } : undefined}
        >
          <g className="shape-size-wrapper" style={{ transform: `scale(${shapeScale}, 1)` }}>
            <g ref={emphasisRef} className="emphasis-wrapper" data-testid="emphasis-wrapper" data-emphasis-state={emphasisState}>
              <rect x={-BAR_WIDTH / 2} y={-BAR_HEIGHT / 2} width={BAR_WIDTH} height={BAR_HEIGHT} rx={BAR_WIDTH / 2} fill={fg} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
