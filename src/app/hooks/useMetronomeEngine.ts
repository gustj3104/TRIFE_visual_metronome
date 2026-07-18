import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clampBpm,
  computeBeatIndex,
  computeElapsedBeats,
  computeIsFirstBeat,
  countTotalFor,
  msUntilNextBeatBoundary,
  rebaseAnchorForBpm,
} from '../metronome/timing';
import type { AnchorState, CountMode, Status } from '../metronome/types';

export interface MetronomeEngine {
  status: Status;
  bpm: number;
  countMode: CountMode;
  /** 0-based beat index within the current count mode, updated only at beat boundaries. */
  currentBeat: number;
  isFirstBeat: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setBpm: (value: number) => void;
  adjustBpm: (delta: number) => void;
  setCountMode: (mode: CountMode) => void;
  /**
   * Continuous elapsed-beats value right now (not modulo). Visualizations
   * use this to seed a freshly (re)created WAAPI Animation's `currentTime`
   * so it continues in phase instead of snapping to its start.
   */
  getElapsedBeats: () => number;
}

/**
 * Owns play/pause/BPM/count-mode/phase state. Never updates React state on
 * every animation frame - only at beat boundaries, detected via a
 * self-correcting performance.now()-based scheduler (not a naive
 * setInterval tick count), so a backgrounded tab resuming mid-beat still
 * lands on the correct beat immediately.
 */
export function useMetronomeEngine(initialBpm: number, initialCountMode: CountMode): MetronomeEngine {
  const [status, setStatus] = useState<Status>('Ready');
  const [bpm, setBpmState] = useState(clampBpm(initialBpm));
  const [countMode, setCountModeState] = useState<CountMode>(initialCountMode);
  const [currentBeat, setCurrentBeat] = useState(0);

  const statusRef = useRef<Status>('Ready');
  const bpmRef = useRef(bpm);
  const countModeRef = useRef(countMode);
  const anchorRef = useRef<AnchorState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearScheduledTick = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor || statusRef.current !== 'Playing') return;

    const now = performance.now();
    const elapsedBeats = computeElapsedBeats(anchor, now);
    const total = countTotalFor(countModeRef.current);
    const beatIndex = computeBeatIndex(elapsedBeats, total);
    setCurrentBeat(beatIndex);

    const delay = msUntilNextBeatBoundary(anchor, now);
    timerRef.current = setTimeout(tick, delay);
  }, []);

  const play = useCallback(() => {
    const now = performance.now();
    anchorRef.current = { anchorTimeMs: now, anchorBeats: 0, bpm: bpmRef.current };
    statusRef.current = 'Playing';
    setStatus('Playing');
    setCurrentBeat(0);

    clearScheduledTick();
    const delay = msUntilNextBeatBoundary(anchorRef.current, now);
    timerRef.current = setTimeout(tick, delay);
  }, [clearScheduledTick, tick]);

  const pause = useCallback(() => {
    statusRef.current = 'Paused';
    setStatus('Paused');
    clearScheduledTick();
  }, [clearScheduledTick]);

  const togglePlay = useCallback(() => {
    if (statusRef.current === 'Playing') pause();
    else play();
  }, [pause, play]);

  const setBpm = useCallback((value: number) => {
    const next = clampBpm(value);
    if (next === bpmRef.current) return;

    if (statusRef.current === 'Playing' && anchorRef.current) {
      const now = performance.now();
      anchorRef.current = rebaseAnchorForBpm(anchorRef.current, now, next);
      bpmRef.current = next;
      setBpmState(next);

      clearScheduledTick();
      const delay = msUntilNextBeatBoundary(anchorRef.current, now);
      timerRef.current = setTimeout(tick, delay);
    } else {
      bpmRef.current = next;
      setBpmState(next);
    }
  }, [clearScheduledTick, tick]);

  const adjustBpm = useCallback((delta: number) => {
    setBpm(bpmRef.current + delta);
  }, [setBpm]);

  const setCountMode = useCallback((mode: CountMode) => {
    countModeRef.current = mode;
    setCountModeState(mode);
    // Re-derive the current beat index immediately under the new total so the
    // count display never shows a stale index; timing/anchor are untouched.
    if (statusRef.current === 'Playing' && anchorRef.current) {
      const now = performance.now();
      const elapsedBeats = computeElapsedBeats(anchorRef.current, now);
      setCurrentBeat(computeBeatIndex(elapsedBeats, countTotalFor(mode)));
    }
  }, []);

  const getElapsedBeats = useCallback(() => {
    if (!anchorRef.current) return 0;
    return computeElapsedBeats(anchorRef.current, performance.now());
  }, []);

  useEffect(() => () => clearScheduledTick(), [clearScheduledTick]);

  return {
    status,
    bpm,
    countMode,
    currentBeat,
    isFirstBeat: computeIsFirstBeat(currentBeat),
    play,
    pause,
    togglePlay,
    setBpm,
    adjustBpm,
    setCountMode,
    getElapsedBeats,
  };
}
