import { useCallback, useEffect, useRef, useState } from 'react';
import type { MetronomeEngine } from '../engine/useMetronomeEngine';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export type EmphasisState = 'first' | 'none';

/** The only emphasis policy: a beat is emphasized iff it's the first beat AND the toggle is on. Never for any other beat. */
export function shouldEmphasizeBeat(firstBeatEmphasisEnabled: boolean, isFirstBeat: boolean): boolean {
  return firstBeatEmphasisEnabled && isFirstBeat;
}

export interface UseBeatEmphasisOptions {
  buildKeyframes: () => Keyframe[];
  durationMs?: number;
  easing?: string;
}

/**
 * Drives the first-beat-only emphasis pop on a wrapper element. No other
 * beat ever receives a scale animation, and toggling the setting off mid
 * play cancels any in-flight emphasis animation immediately and restores
 * scale(1) without touching the position animation, engine anchor, or bpm.
 */
export function useBeatEmphasis(
  ref: React.RefObject<(HTMLElement | SVGElement) | null>,
  engine: MetronomeEngine,
  firstBeatEmphasisEnabled: boolean,
  options: UseBeatEmphasisOptions,
): EmphasisState {
  const { durationMs = 170, easing = 'cubic-bezier(0.34,1.56,0.64,1)' } = options;
  const [emphasisState, setEmphasisState] = useState<EmphasisState>('none');

  const enabledRef = useRef(firstBeatEmphasisEnabled);
  useEffect(() => {
    enabledRef.current = firstBeatEmphasisEnabled;
  }, [firstBeatEmphasisEnabled]);

  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  // Kept "latest" via a ref (rather than as an effect dependency) so the
  // beat subscription below doesn't tear down and resubscribe on every
  // render — options.buildKeyframes is a fresh closure each render.
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const animRef = useRef<Animation | null>(null);

  const resetToBaseline = useCallback(() => {
    animRef.current?.cancel();
    animRef.current = null;
    const el = ref.current;
    if (el) el.style.transform = 'scale(1)';
    setEmphasisState('none');
  }, [ref]);

  // On→Off must cancel any in-flight emphasis immediately, not wait for the
  // next beat event.
  useEffect(() => {
    // Imperative sync with the DOM/WAAPI (cancel + reset transform), not a
    // derived-state mirror — the setState inside is just to keep the
    // test-visible emphasis-state attribute consistent with that reset.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!firstBeatEmphasisEnabled) resetToBaseline();
  }, [firstBeatEmphasisEnabled, resetToBaseline]);

  useEffect(() => {
    return engine.subscribeBeat(({ isFirstBeat }) => {
      const shouldEmphasize = shouldEmphasizeBeat(enabledRef.current, isFirstBeat);
      const el = ref.current;
      if (!shouldEmphasize || !el) {
        resetToBaseline();
        return;
      }

      animRef.current?.cancel();

      if (reducedMotionRef.current) {
        el.style.transform = 'scale(1)';
        animRef.current = null;
        setEmphasisState('first');
        return;
      }

      setEmphasisState('first');
      const anim = el.animate(optionsRef.current.buildKeyframes(), {
        duration: optionsRef.current.durationMs ?? durationMs,
        easing: optionsRef.current.easing ?? easing,
        fill: 'forwards',
      });
      animRef.current = anim;
      anim.onfinish = () => {
        el.style.transform = 'scale(1)';
        animRef.current = null;
        setEmphasisState('none');
      };
    });
  }, [engine, ref, durationMs, easing, resetToBaseline]);

  useEffect(() => () => {
    animRef.current?.cancel();
  }, []);

  return emphasisState;
}
