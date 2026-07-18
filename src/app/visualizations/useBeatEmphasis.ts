import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { Status } from '../metronome/types';
import { playBeatEmphasis, type EmphasisScales } from './beatEmphasis';

export interface UseBeatEmphasisParams {
  status: Status;
  currentBeat: number;
  isFirstBeat: boolean;
  firstBeatEmphasis: boolean;
  scales: EmphasisScales;
  toTransform?: (scale: number) => string;
}

/**
 * Fires one scale-emphasis pulse per beat boundary. `currentBeat` only
 * changes at beat boundaries (see useMetronomeEngine), so this effect runs
 * at beat frequency, never per animation frame.
 */
export function useBeatEmphasis(params: UseBeatEmphasisParams): React.RefObject<SVGGElement | null> {
  const ref = useRef<SVGGElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const reducedMotion = useReducedMotion();

  const { status, currentBeat, isFirstBeat, firstBeatEmphasis, scales, toTransform } = params;

  useEffect(() => {
    if (status !== 'Playing') return;
    playBeatEmphasis(ref.current, animationRef, scales, {
      isFirstBeat,
      firstBeatEmphasisEnabled: firstBeatEmphasis,
      reducedMotion,
    }, toTransform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentBeat]);

  useEffect(() => () => {
    animationRef.current?.cancel();
    animationRef.current = null;
  }, []);

  return ref;
}
