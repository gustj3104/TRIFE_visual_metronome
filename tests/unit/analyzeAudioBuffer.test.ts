import { describe, expect, it } from 'vitest';
import { analyzeAudioBuffer, type AudioBufferLike } from '../../src/app/audio/analyzeAudioBuffer';
import { FileAnalysisError } from '../../src/app/audio/errors';
import { generateClickTrack, generateSilence } from './helpers/syntheticAudio';

function makeBuffer(channels: Float32Array[], sampleRate = 44100): AudioBufferLike {
  return {
    sampleRate,
    numberOfChannels: channels.length,
    length: channels[0]?.length ?? 0,
    getChannelData: (channel: number) => {
      const data = channels[channel];
      if (!data) throw new Error(`no channel ${channel}`);
      return data;
    },
  };
}

describe('analyzeAudioBuffer', () => {
  it('detects the BPM of a steady click track, with half/double candidates', () => {
    const samples = generateClickTrack(128, 10);
    const result = analyzeAudioBuffer(makeBuffer([samples]));
    expect(Math.abs(result.bpm - 128)).toBeLessThanOrEqual(1);
    expect(result.halfBpm).toBe(Math.round(result.bpm / 2));
    expect(result.doubleBpm).toBeNull(); // result.bpm * 2 is ~256, over MAX_BPM
    expect(result.source).toBe('file');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('mixes multiple channels down to mono before analysis', () => {
    const left = generateClickTrack(100, 6);
    const right = generateClickTrack(100, 6);
    const result = analyzeAudioBuffer(makeBuffer([left, right]));
    expect(Math.abs(result.bpm - 100)).toBeLessThanOrEqual(1);
  });

  it('prefers a tempo that repeats across multiple sampled segments of a long file', () => {
    // A file long enough to trigger segment sampling (start/middle/end),
    // steady throughout, so the same tempo should win in every segment.
    const samples = generateClickTrack(140, 130);
    const result = analyzeAudioBuffer(makeBuffer([samples]));
    expect(Math.abs(result.bpm - 140)).toBeLessThanOrEqual(1);
  });

  it('throws no-audio-channel for a buffer with zero channels', () => {
    expect(() => analyzeAudioBuffer(makeBuffer([]))).toThrowError(FileAnalysisError);
    try {
      analyzeAudioBuffer(makeBuffer([]));
    } catch (err) {
      expect((err as FileAnalysisError).code).toBe('no-audio-channel');
    }
  });

  it('throws too-short for a buffer under the minimum usable duration', () => {
    const samples = generateSilence(0.2);
    try {
      analyzeAudioBuffer(makeBuffer([samples]));
      expect.unreachable('expected analyzeAudioBuffer to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(FileAnalysisError);
      expect((err as FileAnalysisError).code).toBe('too-short');
    }
  });

  it('throws no-stable-bpm for silence', () => {
    const samples = generateSilence(5);
    try {
      analyzeAudioBuffer(makeBuffer([samples]));
      expect.unreachable('expected analyzeAudioBuffer to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(FileAnalysisError);
      expect((err as FileAnalysisError).code).toBe('no-stable-bpm');
    }
  });
});
