import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const analyzeFullBufferMock = vi.fn();
vi.mock('realtime-bpm-analyzer', () => ({
  analyzeFullBuffer: (...args: unknown[]) => (analyzeFullBufferMock as (...a: unknown[]) => unknown)(...args),
}));

import { useAudioFileAnalysis } from '../../src/app/hooks/useAudioFileAnalysis';
import { MAX_AUDIO_FILE_SIZE_BYTES } from '../../src/app/audio/constants';
import type { AudioBufferLike } from '../../src/app/audio/analyzeAudioBuffer';
import { generateClickTrack, generateSilence } from './helpers/syntheticAudio';
import { createDeferred } from './helpers/deferred';

function makeFile(name: string, type: string, size?: number): File {
  const file = new File([new Uint8Array(16)], name, { type });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
}

function makeBufferLike(samples: Float32Array, sampleRate = 44100): AudioBufferLike & AudioBuffer {
  return {
    sampleRate,
    numberOfChannels: 1,
    length: samples.length,
    duration: samples.length / sampleRate,
    getChannelData: () => samples,
  } as unknown as AudioBufferLike & AudioBuffer;
}

function installFakeAudioContext(decodeAudioData: (buf: ArrayBuffer) => Promise<AudioBufferLike>) {
  class FakeAudioContext {
    state = 'running';
    decodeAudioData(buf: ArrayBuffer) {
      return decodeAudioData(buf);
    }
    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
}

beforeEach(() => {
  analyzeFullBufferMock.mockReset();
  // Default: rbpm returns nothing, matching this suite's original
  // (pre-ensemble) jsdom behavior where rbpm was unavailable — existing
  // tests below assert on the custom engine alone unless they configure
  // analyzeFullBufferMock themselves.
  analyzeFullBufferMock.mockResolvedValue([]);
  installFakeAudioContext(async () => makeBufferLike(generateClickTrack(120, 6)));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useAudioFileAnalysis', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useAudioFileAnalysis());
    expect(result.current.state).toEqual({ status: 'empty' });
  });

  it('rejects a file over the max size without attempting to decode', () => {
    const decodeSpy = vi.fn();
    installFakeAudioContext(decodeSpy);
    const { result } = renderHook(() => useAudioFileAnalysis());
    const bigFile = makeFile('big.mp3', 'audio/mpeg', MAX_AUDIO_FILE_SIZE_BYTES + 1);

    act(() => result.current.selectFile(bigFile));

    expect(result.current.state.status).toBe('error');
    expect(decodeSpy).not.toHaveBeenCalled();
  });

  it('rejects an unsupported file type', () => {
    const { result } = renderHook(() => useAudioFileAnalysis());
    const file = makeFile('video.mov', 'video/quicktime');

    act(() => result.current.selectFile(file));

    expect(result.current.state.status).toBe('error');
  });

  it('goes decoding -> analyzing -> success for a valid file with a steady beat', async () => {
    const { result } = renderHook(() => useAudioFileAnalysis());
    const file = makeFile('track.wav', 'audio/wav');

    act(() => result.current.selectFile(file));
    expect(result.current.state.status).toBe('decoding');

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.durationSec).toBeCloseTo(6, 0);
    if (result.current.state.status === 'success') {
      expect(result.current.state.result.bpm).toBeGreaterThan(0);
    }
  });

  it('surfaces a decode-failed error when decodeAudioData rejects', async () => {
    installFakeAudioContext(async () => {
      throw new Error('bad data');
    });
    const { result } = renderHook(() => useAudioFileAnalysis());
    act(() => result.current.selectFile(makeFile('track.mp3', 'audio/mpeg')));

    await waitFor(() => expect(result.current.state.status).toBe('error'));
  });

  it('surfaces a no-stable-bpm error for silent audio', async () => {
    installFakeAudioContext(async () => makeBufferLike(generateSilence(5)));
    const { result } = renderHook(() => useAudioFileAnalysis());
    act(() => result.current.selectFile(makeFile('silence.wav', 'audio/wav')));

    await waitFor(() => expect(result.current.state.status).toBe('error'));
  });

  it('removeFile resets to empty and clears duration', async () => {
    const { result } = renderHook(() => useAudioFileAnalysis());
    act(() => result.current.selectFile(makeFile('track.wav', 'audio/wav')));
    await waitFor(() => expect(result.current.state.status).toBe('success'));

    act(() => result.current.removeFile());
    expect(result.current.state).toEqual({ status: 'empty' });
    expect(result.current.durationSec).toBeNull();
  });

  it('invalidates a stale decode: selecting a second file before the first resolves discards the first result', async () => {
    const deferredA = createDeferred<AudioBufferLike>();
    const deferredB = createDeferred<AudioBufferLike>();
    let call = 0;
    installFakeAudioContext(() => (call++ === 0 ? deferredA.promise : deferredB.promise));

    const { result } = renderHook(() => useAudioFileAnalysis());
    const fileA = makeFile('a.wav', 'audio/wav');
    const fileB = makeFile('b.wav', 'audio/wav');

    act(() => result.current.selectFile(fileA));
    await waitFor(() => expect(result.current.state.status).toBe('decoding'));

    act(() => result.current.selectFile(fileB));
    await waitFor(() => {
      expect(result.current.state.status).toBe('decoding');
      if (result.current.state.status === 'decoding') expect(result.current.state.file).toBe(fileB);
    });

    // Resolve the stale (A) decode after B has already superseded it.
    act(() => deferredA.resolve(makeBufferLike(generateClickTrack(90, 6))));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    // Must still be tracking B, never having flipped to A's result.
    const currentFile = result.current.state.status !== 'empty' ? result.current.state.file : null;
    expect(currentFile).toBe(fileB);

    act(() => deferredB.resolve(makeBufferLike(generateClickTrack(120, 6))));
    await waitFor(() => expect(result.current.state.status).toBe('success'));
    if (result.current.state.status === 'success') {
      expect(result.current.state.file).toBe(fileB);
    }
  });

  it('a stale decode resolving after removeFile() must not resurrect a non-empty state', async () => {
    const deferred = createDeferred<AudioBufferLike>();
    installFakeAudioContext(() => deferred.promise);

    const { result } = renderHook(() => useAudioFileAnalysis());
    act(() => result.current.selectFile(makeFile('a.wav', 'audio/wav')));
    await waitFor(() => expect(result.current.state.status).toBe('decoding'));

    act(() => result.current.removeFile());
    expect(result.current.state).toEqual({ status: 'empty' });

    act(() => deferred.resolve(makeBufferLike(generateClickTrack(120, 6))));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.state).toEqual({ status: 'empty' });
  });
});

describe('useAudioFileAnalysis — ensemble', () => {
  it('combines with rbpm when both engines agree, reporting engine: "ensemble"', async () => {
    analyzeFullBufferMock.mockResolvedValue([{ tempo: 121, count: 20, confidence: 0.9 }]);
    const { result } = renderHook(() => useAudioFileAnalysis());
    act(() => result.current.selectFile(makeFile('track.wav', 'audio/wav')));

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    if (result.current.state.status === 'success') {
      expect(result.current.state.result.engine).toBe('ensemble');
      expect(result.current.state.result.estimates).toHaveLength(2);
    }
  });

  it('falls back to engine: "custom" when rbpm is unavailable, without failing the analysis', async () => {
    analyzeFullBufferMock.mockRejectedValue(new Error('worklet unavailable in this environment'));
    const { result } = renderHook(() => useAudioFileAnalysis());
    act(() => result.current.selectFile(makeFile('track.wav', 'audio/wav')));

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    if (result.current.state.status === 'success') {
      expect(result.current.state.result.engine).toBe('custom');
      expect(result.current.state.result.bpm).toBeGreaterThan(0);
    }
  });

  it('surfaces a half-double alternative when rbpm disagrees by exactly one octave', async () => {
    // Custom analyzes a 120 BPM click track; rbpm (mocked) reports its half.
    analyzeFullBufferMock.mockResolvedValue([{ tempo: 60, count: 20, confidence: 0.9 }]);
    const { result } = renderHook(() => useAudioFileAnalysis());
    act(() => result.current.selectFile(makeFile('track.wav', 'audio/wav')));

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    if (result.current.state.status === 'success') {
      expect(result.current.state.result.bpm).toBe(120);
      expect(result.current.state.result.alternativeBpm).toBe(60);
    }
  });
});
