import { useEffect, useRef } from 'react';
import { BASE_BPM } from '../metronome/constants';
import { bpmToBeatDurationMs, computePlaybackRate, elapsedBeatsToBaseCurrentTimeMs } from '../metronome/timing';
import type { Status } from '../metronome/types';

export interface UsePositionAnimationParams {
  status: Status;
  bpm: number;
  /** Keyframes describing one endpoint-to-endpoint traversal (linear, alternated by WAAPI). */
  keyframes: Keyframe[];
  /** Static transform applied (no animation) while status === 'Ready'. */
  idleTransform: string;
  /** Live continuous elapsed-beats getter from the metronome engine, used to seed phase on (re)creation. */
  getElapsedBeats: () => number;
}

/**
 * Drives the "movement" wrapper of a visualization via Element.animate().
 * One iteration == one beat (endpoint reached), linear easing, alternating
 * direction, running forever while Playing. BPM changes only touch
 * `playbackRate` so an in-flight animation never resets or jumps.
 */
export function usePositionAnimation(params: UsePositionAnimationParams): React.RefObject<SVGGElement | null> {
  const ref = useRef<SVGGElement>(null);
  const animationRef = useRef<Animation | null>(null);

  const { status, bpm, keyframes, idleTransform, getElapsedBeats } = params;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (status !== 'Playing') {
      animationRef.current?.pause();
      if (status === 'Ready') {
        animationRef.current?.cancel();
        animationRef.current = null;
        el.style.transform = idleTransform;
      }
      return;
    }

    // Entering (or continuing within) Playing with fresh geometry: replace
    // any previous animation and seed phase from the engine's live clock so
    // a restart-from-first-beat (elapsedBeats ~ 0) starts at the origin,
    // while a direction/viz switch mid-play keeps going from where it was.
    animationRef.current?.cancel();
    const animation = el.animate(keyframes, {
      duration: bpmToBeatDurationMs(BASE_BPM),
      easing: 'linear',
      direction: 'alternate',
      iterations: Infinity,
      fill: 'none',
    });
    animation.currentTime = elapsedBeatsToBaseCurrentTimeMs(getElapsedBeats());
    animation.playbackRate = computePlaybackRate(bpm);
    animationRef.current = animation;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, keyframes]);

  // BPM changes never recreate the animation - only its speed.
  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.playbackRate = computePlaybackRate(bpm);
    }
  }, [bpm]);

  useEffect(() => () => {
    animationRef.current?.cancel();
    animationRef.current = null;
  }, []);

  return ref;
}
