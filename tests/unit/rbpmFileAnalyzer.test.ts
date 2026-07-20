import { beforeEach, describe, expect, it, vi } from 'vitest';

const analyzeFullBufferMock = vi.fn();
vi.mock('realtime-bpm-analyzer', () => ({
  analyzeFullBuffer: (...args: unknown[]) => (analyzeFullBufferMock as (...a: unknown[]) => unknown)(...args),
}));

import { analyzeFileWithRbpm } from '../../src/app/audio/rbpm/rbpmFileAnalyzer';

function makeBuffer(durationSec: number, sampleRate = 44100): AudioBuffer {
  const length = Math.floor(durationSec * sampleRate);
  return {
    sampleRate,
    numberOfChannels: 1,
    length,
    duration: durationSec,
    getChannelData: () => new Float32Array(length),
  } as unknown as AudioBuffer;
}

class FakeAudioBuffer {
  length: number;
  numberOfChannels: number;
  sampleRate: number;
  private channels: Float32Array[];
  constructor(opts: { length: number; numberOfChannels: number; sampleRate: number }) {
    this.length = opts.length;
    this.numberOfChannels = opts.numberOfChannels;
    this.sampleRate = opts.sampleRate;
    this.channels = Array.from({ length: opts.numberOfChannels }, () => new Float32Array(opts.length));
  }
  getChannelData(ch: number) {
    return this.channels[ch] ?? new Float32Array(this.length);
  }
  copyToChannel(source: Float32Array, ch: number) {
    this.channels[ch]?.set(source);
  }
}

beforeEach(() => {
  analyzeFullBufferMock.mockReset();
  vi.stubGlobal('AudioBuffer', FakeAudioBuffer);
});

describe('analyzeFileWithRbpm', () => {
  it('analyzes a short file as a single segment', async () => {
    analyzeFullBufferMock.mockResolvedValue([{ tempo: 128, count: 20, confidence: 0.9 }]);
    const result = await analyzeFileWithRbpm(makeBuffer(10));
    expect(analyzeFullBufferMock).toHaveBeenCalledTimes(1);
    expect(result?.bpm).toBe(128);
  });

  it('analyzes a long file in 3 segments and combines agreeing results', async () => {
    analyzeFullBufferMock
      .mockResolvedValueOnce([{ tempo: 128, count: 20, confidence: 0.9 }])
      .mockResolvedValueOnce([{ tempo: 129, count: 18, confidence: 0.85 }])
      .mockResolvedValueOnce([{ tempo: 128, count: 22, confidence: 0.9 }]);

    const result = await analyzeFileWithRbpm(makeBuffer(120));
    expect(analyzeFullBufferMock).toHaveBeenCalledTimes(3);
    expect(result?.bpm).toBeCloseTo(128, 0);
    // all 3 segments agreed, so all 3 contribute to the combined sample count
    expect(result?.sampleCount).toBe(20 + 18 + 22);
  });

  it('ignores an outlier segment when combining', async () => {
    analyzeFullBufferMock
      .mockResolvedValueOnce([{ tempo: 128, count: 20, confidence: 0.9 }])
      .mockResolvedValueOnce([{ tempo: 128, count: 18, confidence: 0.85 }])
      .mockResolvedValueOnce([{ tempo: 90, count: 5, confidence: 0.3 }]);

    const result = await analyzeFileWithRbpm(makeBuffer(120));
    expect(result?.bpm).toBe(128);
    expect(result?.sampleCount).toBe(20 + 18);
  });

  it('one failing segment does not sink the others', async () => {
    analyzeFullBufferMock
      .mockResolvedValueOnce([{ tempo: 128, count: 20, confidence: 0.9 }])
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([{ tempo: 128, count: 22, confidence: 0.9 }]);

    const result = await analyzeFileWithRbpm(makeBuffer(120));
    expect(result?.bpm).toBe(128);
  });

  it('returns null when every segment fails or is empty', async () => {
    analyzeFullBufferMock.mockResolvedValue([]);
    const result = await analyzeFileWithRbpm(makeBuffer(10));
    expect(result).toBeNull();
  });

  describe('middle-first early exit (performance optimization)', () => {
    it('analyzes only the middle segment when it already agrees with the custom-engine hint and is solid on its own', async () => {
      analyzeFullBufferMock.mockResolvedValueOnce([{ tempo: 128, count: 20, confidence: 0.9 }]);

      const result = await analyzeFileWithRbpm(makeBuffer(120), 128);

      expect(analyzeFullBufferMock).toHaveBeenCalledTimes(1);
      expect(result?.bpm).toBe(128);
    });

    it('falls back to analyzing all 3 segments when the middle segment disagrees with the custom-engine hint', async () => {
      analyzeFullBufferMock
        .mockResolvedValueOnce([{ tempo: 90, count: 20, confidence: 0.9 }]) // middle — conflicts with hint
        .mockResolvedValueOnce([{ tempo: 128, count: 18, confidence: 0.85 }])
        .mockResolvedValueOnce([{ tempo: 128, count: 22, confidence: 0.9 }]);

      const result = await analyzeFileWithRbpm(makeBuffer(120), 128);

      expect(analyzeFullBufferMock).toHaveBeenCalledTimes(3);
      expect(result?.bpm).toBe(128);
    });

    it('falls back to analyzing all 3 segments when the middle segment is weak even though it numerically agrees', async () => {
      analyzeFullBufferMock
        .mockResolvedValueOnce([{ tempo: 128, count: 2, confidence: 0.05 }]) // agrees, but not solid on its own
        .mockResolvedValueOnce([{ tempo: 128, count: 18, confidence: 0.85 }])
        .mockResolvedValueOnce([{ tempo: 128, count: 22, confidence: 0.9 }]);

      const result = await analyzeFileWithRbpm(makeBuffer(120), 128);

      expect(analyzeFullBufferMock).toHaveBeenCalledTimes(3);
      expect(result?.bpm).toBe(128);
    });

    it('analyzes all 3 segments when no custom-engine hint is available', async () => {
      analyzeFullBufferMock.mockResolvedValue([{ tempo: 128, count: 20, confidence: 0.9 }]);
      await analyzeFileWithRbpm(makeBuffer(120));
      expect(analyzeFullBufferMock).toHaveBeenCalledTimes(3);
    });
  });
});
