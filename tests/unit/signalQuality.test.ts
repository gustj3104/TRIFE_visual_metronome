import { describe, expect, it } from 'vitest';
import { SignalQualityTracker } from '../../src/app/audio/signalQuality';

const FRAME_MS = 16;

function silentFrame(size = 2048): Float32Array {
  return new Float32Array(size);
}

function loudFrame(amplitude: number, size = 2048): Float32Array {
  const frame = new Float32Array(size);
  for (let i = 0; i < size; i++) frame[i] = amplitude * Math.sin((2 * Math.PI * 100 * i) / 44100);
  return frame;
}

function clippedFrame(size = 2048): Float32Array {
  const frame = new Float32Array(size);
  for (let i = 0; i < size; i++) frame[i] = i % 2 === 0 ? 1 : -1;
  return frame;
}

/** Feeds frames at a fixed frame rate for durationMs, starting at startMs, returning the last result and the elapsed time reached. */
function runFrames(tracker: SignalQualityTracker, makeFrame: () => Float32Array, durationMs: number, startMs = 0) {
  let elapsedMs = startMs;
  let result;
  const endMs = startMs + durationMs;
  while (elapsedMs <= endMs) {
    result = tracker.update(makeFrame(), elapsedMs);
    elapsedMs += FRAME_MS;
  }
  return { result: result!, elapsedMs };
}

describe('SignalQualityTracker', () => {
  it('reports "too-quiet" once sustained silence exceeds the dwell time', () => {
    const tracker = new SignalQualityTracker();
    const { result } = runFrames(tracker, silentFrame, 3_000);
    expect(result.level).toBe('too-quiet');
  });

  it('does not yet report "too-quiet" before the dwell time has elapsed, even though the raw signal is already quiet', () => {
    const tracker = new SignalQualityTracker();
    const { result } = runFrames(tracker, silentFrame, 500); // well under the 2s dwell
    expect(result.level).toBe('ok');
  });

  it('reports "ok" for a sustained healthy loud signal', () => {
    const tracker = new SignalQualityTracker();
    const { result } = runFrames(tracker, () => loudFrame(0.5), 500);
    expect(result.level).toBe('ok');
  });

  it('reports "too-loud" once sustained clipping exceeds its (shorter) dwell time', () => {
    const tracker = new SignalQualityTracker();
    const { result } = runFrames(tracker, clippedFrame, 1_000);
    expect(result.level).toBe('too-loud');
  });

  it('does not flag "too-quiet" during a brief silent gap right after a loud peak (peak-follower + dwell both smooth this out)', () => {
    const tracker = new SignalQualityTracker();
    const { elapsedMs } = runFrames(tracker, () => loudFrame(0.5), 200);
    const result = tracker.update(silentFrame(), elapsedMs + FRAME_MS);
    expect(result.level).toBe('ok');
  });

  it('recovers to "ok" only after the recovery dwell, not on the very first good frame', () => {
    const tracker = new SignalQualityTracker();
    const { elapsedMs: afterQuiet } = runFrames(tracker, silentFrame, 3_000);

    const firstLoudFrame = tracker.update(loudFrame(0.5), afterQuiet + FRAME_MS);
    expect(firstLoudFrame.level).toBe('too-quiet'); // not recovered yet — only one good frame so far

    const { result: afterRecoveryDwell } = runFrames(tracker, () => loudFrame(0.5), 1_500, afterQuiet + FRAME_MS);
    expect(afterRecoveryDwell.level).toBe('ok');
  });

  it('reset() clears accumulated peak/clipping/dwell state', () => {
    const tracker = new SignalQualityTracker();
    runFrames(tracker, () => loudFrame(0.5), 500);
    tracker.reset();
    const { result } = runFrames(tracker, silentFrame, 3_000);
    expect(result.level).toBe('too-quiet');
  });
});
