import { useEffect } from 'react';
import type { MetronomeEngine } from './useMetronomeEngine';

export interface PhaseAnimationOptions {
  /** Called once (per active mount) to build this animation's keyframes. */
  buildKeyframes: () => Keyframe[];
  /** 'alternate' for back-and-forth motion (Bounce/Swing/Sweep), 'normal' for a repeating one-way sweep (Pulse ring). */
  direction?: PlaybackDirection;
}

/**
 * Creates a single WAAPI Animation on `ref`'s element for as long as the
 * metronome is active (Playing or Paused), and hands its lifecycle to the
 * engine via `registerAnimation`. The animation is only (re)created when
 * `active` flips true or one of `deps` changes — never on a bpm change,
 * which the engine instead applies via in-place duration/currentTime
 * rescaling so phase is preserved.
 */
export function usePhaseAnimation(
  ref: React.RefObject<Element | null>,
  engine: MetronomeEngine,
  active: boolean,
  options: PhaseAnimationOptions,
  deps: unknown[],
): void {
  const { registerAnimation, getBeatDurationMs } = engine;
  const { buildKeyframes, direction = 'alternate' } = options;
  const effectDeps = [active, registerAnimation, getBeatDurationMs, ref, ...deps];

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;

    const animation = el.animate(buildKeyframes(), {
      duration: getBeatDurationMs(),
      iterations: Infinity,
      direction,
      easing: 'linear',
      fill: 'both',
    });
    const unregister = registerAnimation(animation);

    return () => {
      unregister();
      animation.cancel();
    };
    // effectDeps is intentionally built from a dynamic `deps` array supplied
    // by each visualization (its own geometry-affecting props); the effect
    // must re-run when active/registerAnimation/ref/deps change but NOT on
    // bpm changes, which the engine rescales on the existing animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, effectDeps);
}
