import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeferred } from './helpers/deferred';
import { generateOnsetTimesMs } from './helpers/syntheticAudio';

const createMicrophoneAnalyzerMock = vi.fn();
vi.mock('../../src/app/audio/createMicrophoneAnalyzer', () => ({
  createMicrophoneAnalyzer: (...args: unknown[]) =>
    (createMicrophoneAnalyzerMock as (...a: unknown[]) => unknown)(...args),
}));

import { useMicrophoneBpm } from '../../src/app/hooks/useMicrophoneBpm';
import { MicrophoneAnalysisError } from '../../src/app/audio/errors';
import type { EngineTempoEstimate } from '../../src/app/audio/ensemble/types';
import type { SignalQuality } from '../../src/app/audio/signalQuality';

type OnFrame = (onsetTimesMs: number[], elapsedMs: number, signalQuality: SignalQuality) => void;
type OnRbpmEstimate = (estimate: EngineTempoEstimate, stable: boolean) => void;

const OK_SIGNAL: SignalQuality = { level: 'ok', peakRms: 1, smoothedClippingRatio: 0 };

function rbpmEstimate(bpm: number): EngineTempoEstimate {
  return {
    engine: 'rbpm',
    bpm,
    rawCandidates: [{ bpm, count: 20, confidence: 0.9 }],
    dominance: 0.9,
    sampleCount: 20,
    analyzedDurationSeconds: 20,
  };
}

beforeEach(() => {
  createMicrophoneAnalyzerMock.mockReset();
});

describe('useMicrophoneBpm', () => {
  it('starts off', () => {
    const { result } = renderHook(() => useMicrophoneBpm(120));
    expect(result.current.state).toEqual({ status: 'off' });
  });

  it('goes requesting-permission -> listening on a successful analyzer start', async () => {
    createMicrophoneAnalyzerMock.mockImplementation(async () => ({ stop: vi.fn() }));
    const { result } = renderHook(() => useMicrophoneBpm(120));

    act(() => result.current.start());
    expect(result.current.state.status).toBe('requesting-permission');

    await waitFor(() => expect(result.current.state.status).toBe('listening'));
  });

  it('maps a permission-denied analyzer failure to an error state with an actionable message', async () => {
    createMicrophoneAnalyzerMock.mockImplementation(async () => {
      throw new MicrophoneAnalysisError('permission-denied');
    });
    const { result } = renderHook(() => useMicrophoneBpm(120));

    act(() => result.current.start());
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    if (result.current.state.status === 'error') {
      expect(result.current.state.message).toMatch(/permission was denied/i);
    }
  });

  it('maps a no-input-device analyzer failure distinctly', async () => {
    createMicrophoneAnalyzerMock.mockImplementation(async () => {
      throw new MicrophoneAnalysisError('no-input-device');
    });
    const { result } = renderHook(() => useMicrophoneBpm(120));

    act(() => result.current.start());
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    if (result.current.state.status === 'error') {
      expect(result.current.state.message).toMatch(/no microphone was found/i);
    }
  });

  it('ignores a second start() while already requesting/listening', async () => {
    createMicrophoneAnalyzerMock.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useMicrophoneBpm(120));

    act(() => result.current.start());
    act(() => result.current.start());

    expect(createMicrophoneAnalyzerMock).toHaveBeenCalledTimes(1);
  });

  it('drives listening -> stabilizing -> success from onFrame callbacks, and stop() tears down + resets to off', async () => {
    let onFrame: OnFrame = () => {};
    const stopFn = vi.fn();
    createMicrophoneAnalyzerMock.mockImplementation(async (callbacks: { onFrame: OnFrame }) => {
      onFrame = callbacks.onFrame;
      return { stop: stopFn };
    });

    const { result } = renderHook(() => useMicrophoneBpm(120));
    act(() => result.current.start());
    await waitFor(() => expect(result.current.state.status).toBe('listening'));

    const onsets = generateOnsetTimesMs(120, 40);
    act(() => {
      for (let n = 4; n <= onsets.length; n++) {
        const slice = onsets.slice(0, n);
        onFrame(slice, slice[slice.length - 1] ?? 0, OK_SIGNAL);
      }
    });

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    if (result.current.state.status === 'success') {
      expect(result.current.state.result.bpm).toBe(120);
      expect(result.current.state.result.source).toBe('microphone');
    }

    act(() => result.current.stop());
    expect(stopFn).toHaveBeenCalledTimes(1);
    expect(result.current.state).toEqual({ status: 'off' });
  });

  it('stop() during requesting-permission discards a late-resolving analyzer instead of reviving it', async () => {
    const deferred = createDeferred<{ stop: () => void }>();
    createMicrophoneAnalyzerMock.mockImplementation(() => deferred.promise);

    const { result } = renderHook(() => useMicrophoneBpm(120));
    act(() => result.current.start());
    expect(result.current.state.status).toBe('requesting-permission');

    act(() => result.current.stop());
    expect(result.current.state).toEqual({ status: 'off' });

    const stopFn = vi.fn();
    await act(async () => {
      deferred.resolve({ stop: stopFn });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.state).toEqual({ status: 'off' });
    expect(stopFn).toHaveBeenCalledTimes(1);
  });

  it('freezes the result once locked in — later onFrame calls with different data do not change it', async () => {
    let onFrame: OnFrame = () => {};
    createMicrophoneAnalyzerMock.mockImplementation(async (callbacks: { onFrame: OnFrame }) => {
      onFrame = callbacks.onFrame;
      return { stop: vi.fn(), reset: vi.fn() };
    });

    const { result } = renderHook(() => useMicrophoneBpm(120));
    act(() => result.current.start());
    await waitFor(() => expect(result.current.state.status).toBe('listening'));

    const onsets120 = generateOnsetTimesMs(120, 40);
    act(() => {
      for (let n = 4; n <= onsets120.length; n++) {
        const slice = onsets120.slice(0, n);
        onFrame(slice, slice[slice.length - 1] ?? 0, OK_SIGNAL);
      }
    });
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    // Feed a completely different, equally-steady 90 BPM timeline after
    // locking in — the displayed result must not silently start tracking it.
    act(() => onFrame(generateOnsetTimesMs(90, 40), 30_000, OK_SIGNAL));
    expect(result.current.state.status).toBe('success');
    if (result.current.state.status === 'success') {
      expect(result.current.state.result.bpm).toBe(120);
    }
  });

  it('listenAgain resumes analysis in place (resets the analyzer, does not tear it down or re-request permission)', async () => {
    let onFrame: OnFrame = () => {};
    const stopFn = vi.fn();
    const resetFn = vi.fn();
    createMicrophoneAnalyzerMock.mockImplementation(async (callbacks: { onFrame: OnFrame }) => {
      onFrame = callbacks.onFrame;
      return { stop: stopFn, reset: resetFn };
    });

    const { result } = renderHook(() => useMicrophoneBpm(120));
    act(() => result.current.start());
    await waitFor(() => expect(result.current.state.status).toBe('listening'));

    const onsets120 = generateOnsetTimesMs(120, 40);
    act(() => {
      for (let n = 4; n <= onsets120.length; n++) {
        const slice = onsets120.slice(0, n);
        onFrame(slice, slice[slice.length - 1] ?? 0, OK_SIGNAL);
      }
    });
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    act(() => result.current.listenAgain());

    expect(resetFn).toHaveBeenCalledTimes(1);
    expect(stopFn).not.toHaveBeenCalled();
    expect(createMicrophoneAnalyzerMock).toHaveBeenCalledTimes(1); // no new permission/stream round-trip
    expect(result.current.state.status).toBe('listening');

    // A fresh 90 BPM timeline now drives a brand new stabilization cycle.
    const onsets90 = generateOnsetTimesMs(90, 40);
    act(() => {
      for (let n = 4; n <= onsets90.length; n++) {
        const slice = onsets90.slice(0, n);
        onFrame(slice, slice[slice.length - 1] ?? 0, OK_SIGNAL);
      }
    });
    await waitFor(() => expect(result.current.state.status).toBe('success'));
    if (result.current.state.status === 'success') {
      expect(result.current.state.result.bpm).toBe(90);
    }
  });

  it('a fresh start() after stop() is unaffected by the previous session', async () => {
    let firstOnFrame: OnFrame = () => {};
    const firstStop = vi.fn();
    createMicrophoneAnalyzerMock.mockImplementationOnce(async (callbacks: { onFrame: OnFrame }) => {
      firstOnFrame = callbacks.onFrame;
      return { stop: firstStop };
    });

    const { result } = renderHook(() => useMicrophoneBpm(120));
    act(() => result.current.start());
    await waitFor(() => expect(result.current.state.status).toBe('listening'));
    act(() => firstOnFrame(generateOnsetTimesMs(120, 6), 3000, OK_SIGNAL));
    act(() => result.current.stop());
    expect(result.current.state).toEqual({ status: 'off' });

    createMicrophoneAnalyzerMock.mockImplementationOnce(async () => ({ stop: vi.fn() }));
    act(() => result.current.start());
    await waitFor(() => expect(result.current.state.status).toBe('listening'));
    // Fresh session must start clean — not pre-populated with the previous
    // session's stabilizing candidate.
    if (result.current.state.status === 'listening') {
      expect(result.current.state.startedAt).toBeGreaterThan(0);
    }
  });
});

describe('useMicrophoneBpm — ensemble with rbpm', () => {
  it('reports engine: "ensemble" once both engines independently agree and repeat', async () => {
    let onFrame: OnFrame = () => {};
    let onRbpmEstimate: OnRbpmEstimate = () => {};
    createMicrophoneAnalyzerMock.mockImplementation(
      async (callbacks: { onFrame: OnFrame; onRbpmEstimate?: OnRbpmEstimate }) => {
        onFrame = callbacks.onFrame;
        if (callbacks.onRbpmEstimate) onRbpmEstimate = callbacks.onRbpmEstimate;
        return { stop: vi.fn(), reset: vi.fn() };
      },
    );

    const { result } = renderHook(() => useMicrophoneBpm(120));
    act(() => result.current.start());
    await waitFor(() => expect(result.current.state.status).toBe('listening'));

    const onsets = generateOnsetTimesMs(120, 40);
    act(() => {
      for (let n = 4; n <= onsets.length; n++) {
        const slice = onsets.slice(0, n);
        onFrame(slice, slice[slice.length - 1] ?? 0, OK_SIGNAL);
        onRbpmEstimate(rbpmEstimate(120), false);
      }
      onRbpmEstimate(rbpmEstimate(120), true);
    });

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    if (result.current.state.status === 'success') {
      expect(result.current.state.result.engine).toBe('ensemble');
      expect(result.current.state.result.estimates).toHaveLength(2);
    }
  });

  it('falls back to the custom engine alone when rbpm reports an error', async () => {
    let onFrame: OnFrame = () => {};
    let onRbpmError: (() => void) | undefined;
    createMicrophoneAnalyzerMock.mockImplementation(
      async (callbacks: { onFrame: OnFrame; onRbpmError?: () => void }) => {
        onFrame = callbacks.onFrame;
        onRbpmError = callbacks.onRbpmError;
        return { stop: vi.fn(), reset: vi.fn() };
      },
    );

    const { result } = renderHook(() => useMicrophoneBpm(120));
    act(() => result.current.start());
    await waitFor(() => expect(result.current.state.status).toBe('listening'));

    act(() => onRbpmError?.());

    const onsets = generateOnsetTimesMs(120, 40);
    act(() => {
      for (let n = 4; n <= onsets.length; n++) {
        const slice = onsets.slice(0, n);
        onFrame(slice, slice[slice.length - 1] ?? 0, OK_SIGNAL);
      }
    });

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    if (result.current.state.status === 'success') {
      expect(result.current.state.result.engine).toBe('custom');
      expect(result.current.state.result.bpm).toBe(120);
    }
  });

  it('does not lock a half-double reading until it matches the currently-applied BPM and repeats enough', async () => {
    let onFrame: OnFrame = () => {};
    let onRbpmEstimate: OnRbpmEstimate = () => {};
    createMicrophoneAnalyzerMock.mockImplementation(
      async (callbacks: { onFrame: OnFrame; onRbpmEstimate?: OnRbpmEstimate }) => {
        onFrame = callbacks.onFrame;
        if (callbacks.onRbpmEstimate) onRbpmEstimate = callbacks.onRbpmEstimate;
        return { stop: vi.fn(), reset: vi.fn() };
      },
    );

    // Metronome currently applied at 60 BPM — matches rbpm's half-double reading's family.
    const { result } = renderHook(() => useMicrophoneBpm(60));
    act(() => result.current.start());
    await waitFor(() => expect(result.current.state.status).toBe('listening'));

    const onsets = generateOnsetTimesMs(120, 60);
    act(() => {
      for (let n = 4; n <= onsets.length; n++) {
        const slice = onsets.slice(0, n);
        onFrame(slice, slice[slice.length - 1] ?? 0, OK_SIGNAL);
        onRbpmEstimate(rbpmEstimate(60), true); // half of custom's 120 -> half-double
      }
    });

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    if (result.current.state.status === 'success') {
      expect(result.current.state.result.bpm).toBe(120);
      expect(result.current.state.result.alternativeBpm).toBe(60);
      expect(result.current.state.result.confidence).toBeLessThan(0.8); // half-double never High
    }
  });
});
