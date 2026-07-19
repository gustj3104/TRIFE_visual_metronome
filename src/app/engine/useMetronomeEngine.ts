import { useCallback, useEffect, useRef, useState } from 'react';
import { clampBpm } from '../lib/bpmInput';
import type { BeatEvent, BeatListener, CountMode, Status } from './types';
import { totalBeatsForMode } from './types';

export interface MetronomeEngine {
  status: Status;
  bpm: number;
  countMode: CountMode;
  totalBeats: number;
  /** 0-indexed current beat. Updates once per beat, never per animation frame. */
  beatNumber: number;
  start: () => void;
  pause: () => void;
  setBpm: (value: number) => void;
  setCountMode: (mode: CountMode) => void;
  /** Fires once per beat boundary — safe for discrete UI/emphasis reactions. */
  subscribeBeat: (listener: BeatListener) => () => void;
  /**
   * Hands a WAAPI Animation's lifecycle to the engine: it will be played,
   * paused, reset, and duration-rescaled (preserving phase) in lockstep with
   * every other registered animation. Returns an unregister function.
   */
  registerAnimation: (animation: Animation) => () => void;
  /** Always-current beat duration, safe to read without a bpm dependency. */
  getBeatDurationMs: () => number;
}

const DEFAULT_BPM = 120;

export function useMetronomeEngine(): MetronomeEngine {
  const [status, setStatus] = useState<Status>('Ready');
  const [bpm, setBpmState] = useState(DEFAULT_BPM);
  const [countMode, setCountModeState] = useState<CountMode>('4/4');
  const [beatNumber, setBeatNumber] = useState(0);

  const statusRef = useRef<Status>('Ready');
  const bpmRef = useRef(DEFAULT_BPM);
  const countModeRef = useRef<CountMode>('4/4');
  const beatIndexRef = useRef(0);
  const lastBeatTimeRef = useRef(0);
  const goingForwardRef = useRef(true);
  const rafRef = useRef(0);
  const listenersRef = useRef<Set<BeatListener>>(new Set());
  const animationsRef = useRef<Set<Animation>>(new Set());

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);
  useEffect(() => {
    countModeRef.current = countMode;
  }, [countMode]);

  const emitBeat = useCallback((beatIndex: number, isFirstBeat: boolean, timestamp: number) => {
    setBeatNumber(beatIndex);
    const event: BeatEvent = { beatIndex, isFirstBeat, timestamp };
    listenersRef.current.forEach((listener) => listener(event));
  }, []);

  // Named function expression: the recursive rAF call refers to this
  // function's own binding rather than the outer `tick` const, which is
  // still initializing while the function body is defined.
  const tick = useCallback(
    function tick(timestamp: number) {
      if (statusRef.current !== 'Playing') return;

      const beatDuration = 60000 / bpmRef.current;
      if (lastBeatTimeRef.current === 0) lastBeatTimeRef.current = timestamp;

      const elapsed = timestamp - lastBeatTimeRef.current;
      if (elapsed >= beatDuration) {
        lastBeatTimeRef.current += beatDuration;
        const total = totalBeatsForMode(countModeRef.current);
        beatIndexRef.current = (beatIndexRef.current + 1) % total;
        goingForwardRef.current = !goingForwardRef.current;
        emitBeat(beatIndexRef.current, beatIndexRef.current === 0, timestamp);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [emitBeat],
  );

  const start = useCallback(() => {
    beatIndexRef.current = 0;
    goingForwardRef.current = true;
    lastBeatTimeRef.current = 0;
    statusRef.current = 'Playing';
    setStatus('Playing');
    setBeatNumber(0);

    animationsRef.current.forEach((anim) => {
      anim.currentTime = 0;
      anim.play();
    });

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    // Beat 0 has already "occurred" the instant playback starts, so the
    // first-beat emphasis (and count display) must fire immediately rather
    // than waiting for the first full beat duration to elapse.
    emitBeat(0, true, performance.now());
  }, [tick, emitBeat]);

  const pause = useCallback(() => {
    statusRef.current = 'Paused';
    setStatus('Paused');
    cancelAnimationFrame(rafRef.current);
    animationsRef.current.forEach((anim) => anim.pause());
  }, []);

  const setBpm = useCallback((value: number) => {
    const next = clampBpm(value);
    if (statusRef.current === 'Playing' && lastBeatTimeRef.current > 0) {
      const now = performance.now();
      const oldDuration = 60000 / bpmRef.current;
      const newDuration = 60000 / next;
      const fraction = Math.min((now - lastBeatTimeRef.current) / oldDuration, 1);
      lastBeatTimeRef.current = now - fraction * newDuration;

      const ratio = newDuration / oldDuration;
      animationsRef.current.forEach((anim) => {
        const currentTime = typeof anim.currentTime === 'number' ? anim.currentTime : 0;
        anim.effect?.updateTiming({ duration: newDuration });
        anim.currentTime = currentTime * ratio;
      });
    }
    bpmRef.current = next;
    setBpmState(next);
  }, []);

  const setCountMode = useCallback((mode: CountMode) => {
    countModeRef.current = mode;
    setCountModeState(mode);
    const total = totalBeatsForMode(mode);
    if (beatIndexRef.current >= total) {
      beatIndexRef.current = 0;
      goingForwardRef.current = true;
      setBeatNumber(0);
    }
  }, []);

  const subscribeBeat = useCallback((listener: BeatListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const registerAnimation = useCallback((animation: Animation) => {
    animationsRef.current.add(animation);
    if (statusRef.current === 'Playing') {
      const beatDuration = 60000 / bpmRef.current;
      const elapsedWithinBeat =
        lastBeatTimeRef.current > 0 ? Math.max(0, performance.now() - lastBeatTimeRef.current) : 0;
      animation.currentTime = beatIndexRef.current * beatDuration + elapsedWithinBeat;
      animation.play();
    } else {
      animation.pause();
    }
    return () => {
      animationsRef.current.delete(animation);
    };
  }, []);

  const getBeatDurationMs = useCallback(() => 60000 / bpmRef.current, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return {
    status,
    bpm,
    countMode,
    totalBeats: totalBeatsForMode(countMode),
    beatNumber,
    start,
    pause,
    setBpm,
    setCountMode,
    subscribeBeat,
    registerAnimation,
    getBeatDurationMs,
  };
}
