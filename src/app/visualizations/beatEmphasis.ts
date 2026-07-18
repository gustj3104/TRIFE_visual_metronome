import {
  EMPHASIS_EASE_IN,
  EMPHASIS_EASE_OUT,
  FIRST_BEAT_EMPHASIS_DURATION_MS,
  NORMAL_BEAT_EMPHASIS_DURATION_MS,
  REDUCED_MOTION_EMPHASIS_FACTOR,
} from '../metronome/constants';

export interface EmphasisScales {
  normal: number;
  first: number;
}

export interface BeatEmphasisOptions {
  isFirstBeat: boolean;
  firstBeatEmphasisEnabled: boolean;
  reducedMotion: boolean;
}

function buildScaleKeyframes(peakScale: number, toTransform: (scale: number) => string): Keyframe[] {
  return [
    { transform: toTransform(1), easing: EMPHASIS_EASE_IN },
    { transform: toTransform(peakScale), easing: EMPHASIS_EASE_OUT },
    { transform: toTransform(1) },
  ];
}

/**
 * Runs one beat's scale-emphasis pulse on `el` via Element.animate(),
 * cancelling any still-running emphasis animation first. Never touches the
 * position wrapper - only the local scale transform on this element.
 *
 * `firstBeatEmphasisEnabled: false` means the first beat gets the same
 * "normal" scale as any other beat (the regular per-beat emphasis policy is
 * unaffected), it never means "no emphasis at all".
 */
export function playBeatEmphasis(
  el: SVGGElement | HTMLElement | null,
  animationRef: React.MutableRefObject<Animation | null>,
  scales: EmphasisScales,
  options: BeatEmphasisOptions,
  toTransform: (scale: number) => string = (s) => `scale(${s})`,
): void {
  if (!el) return;

  animationRef.current?.cancel();

  const useFirstBeatScale = options.isFirstBeat && options.firstBeatEmphasisEnabled;
  const rawPeak = useFirstBeatScale ? scales.first : scales.normal;
  const peak = options.reducedMotion ? 1 + (rawPeak - 1) * REDUCED_MOTION_EMPHASIS_FACTOR : rawPeak;
  const duration = useFirstBeatScale ? FIRST_BEAT_EMPHASIS_DURATION_MS : NORMAL_BEAT_EMPHASIS_DURATION_MS;

  const animation = el.animate(buildScaleKeyframes(peak, toTransform), {
    duration,
    fill: 'none',
  });
  animationRef.current = animation;
}
