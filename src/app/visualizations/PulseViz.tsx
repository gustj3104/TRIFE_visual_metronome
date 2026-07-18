import { useEffect, useMemo, useRef } from 'react';
import { BASE_BPM } from '../metronome/constants';
import { bpmToBeatDurationMs, computePlaybackRate, elapsedBeatsToBaseCurrentTimeMs } from '../metronome/timing';
import type { Status } from '../metronome/types';
import { useBeatEmphasis } from './useBeatEmphasis';

const SCALES = { normal: 1.24, first: 1.48 };

// Matches the product's original sinusoidal ease-in-out (slow at endpoints, fast mid-beat).
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function sampleRingKeyframes(radiusOpacityAt: (t: number) => { r: number; opacity: number; strokeWidth: number }): Keyframe[] {
  const offsets = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  return offsets.map((t) => {
    const { r, opacity, strokeWidth } = radiusOpacityAt(t);
    return { r: String(r), opacity: String(opacity), strokeWidth: String(strokeWidth), offset: t };
  });
}

function buildRing1Keyframes(): Keyframe[] {
  return sampleRingKeyframes((t) => {
    const eased = easeInOutQuad(t);
    return { r: 60 + eased * 250, opacity: (1 - eased) * 0.6, strokeWidth: 2.5 };
  });
}

function buildRing2Keyframes(): Keyframe[] {
  return sampleRingKeyframes((t) => {
    if (t <= 0.4) return { r: 60, opacity: 0, strokeWidth: 1.5 };
    const local = (t - 0.4) / 0.6;
    const eased = easeInOutQuad(local);
    return { r: 60 + eased * 250, opacity: (1 - eased) * 0.3, strokeWidth: 1.5 };
  });
}

/** Drives a decorative ripple ring that only exists while actively playing
 * (matching the product's original behavior of hiding it outright when
 * paused, rather than freezing it in place). */
function useRingAnimation(status: Status, bpm: number, keyframes: Keyframe[], getElapsedBeats: () => number) {
  const ref = useRef<SVGCircleElement>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || status !== 'Playing') return undefined;

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

    return () => {
      animation.cancel();
      animationRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, keyframes]);

  useEffect(() => {
    if (animationRef.current) animationRef.current.playbackRate = computePlaybackRate(bpm);
  }, [bpm]);

  return ref;
}

interface PulseVizProps {
  fg: string;
  status: Status;
  bpm: number;
  currentBeat: number;
  isFirstBeat: boolean;
  firstBeatEmphasis: boolean;
  getElapsedBeats: () => number;
}

export function PulseViz({ fg, status, bpm, currentBeat, isFirstBeat, firstBeatEmphasis, getElapsedBeats }: PulseVizProps) {
  const ring1Keyframes = useMemo(buildRing1Keyframes, []);
  const ring2Keyframes = useMemo(buildRing2Keyframes, []);
  const ring1Ref = useRingAnimation(status, bpm, ring1Keyframes, getElapsedBeats);
  const ring2Ref = useRingAnimation(status, bpm, ring2Keyframes, getElapsedBeats);
  const scaleRef = useBeatEmphasis({ status, currentBeat, isFirstBeat, firstBeatEmphasis, scales: SCALES });
  const playing = status === 'Playing';

  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
      {/* stroke-opacity/width/r are driven entirely by the WAAPI keyframes (already 0..0.6 / 0..0.3 scaled) */}
      {playing && <circle ref={ring1Ref} cx={500} cy={500} r={60} fill="none" stroke={fg} />}
      {playing && <circle ref={ring2Ref} cx={500} cy={500} r={60} fill="none" stroke={fg} />}
      <g transform="translate(500, 500)">
        <g ref={scaleRef} data-testid="pulse-scale-wrapper">
          <circle r={55} fill={fg} />
        </g>
      </g>
    </svg>
  );
}
