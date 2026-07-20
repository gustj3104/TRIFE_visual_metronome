import { describe, expect, it } from 'vitest';
import { BpmStabilizer } from '../../src/app/audio/bpmStabilizer';
import { MIC_MIN_ANALYSIS_MS, MIC_MIN_ONSET_COUNT } from '../../src/app/audio/constants';
import { generateOnsetTimesMs } from './helpers/syntheticAudio';

describe('BpmStabilizer', () => {
  it('stays in listening while there are fewer than two onsets', () => {
    const stabilizer = new BpmStabilizer();
    expect(stabilizer.update([], 1000).phase).toBe('listening');
    expect(stabilizer.update([100], 1200).phase).toBe('listening');
  });

  it('reports stabilizing before the minimum analysis time has elapsed, even with a clean tempo', () => {
    const stabilizer = new BpmStabilizer();
    const onsets = generateOnsetTimesMs(120, 6); // ~3s of onsets at 120 BPM
    const output = stabilizer.update(onsets, 3000);
    expect(output.phase).toBe('stabilizing');
    expect(output.candidateBpm).toBe(120);
  });

  it('reaches success once enough time has passed, enough onsets exist, and recent estimates agree', () => {
    const stabilizer = new BpmStabilizer();
    const bpm = 128;
    const onsetIntervalMs = 60000 / bpm;
    const minOnsets = Math.max(MIC_MIN_ONSET_COUNT, Math.ceil(MIC_MIN_ANALYSIS_MS / onsetIntervalMs) + 4);

    let output;
    for (let count = 4; count <= minOnsets; count++) {
      const onsets = generateOnsetTimesMs(bpm, count);
      const elapsedMs = onsets[onsets.length - 1] ?? 0;
      output = stabilizer.update(onsets, elapsedMs);
    }

    expect(output?.phase).toBe('success');
    expect(output?.result?.bpm).toBe(128);
    expect(output?.result?.source).toBe('microphone');
  });

  it('does not report success before MIC_MIN_ANALYSIS_MS even with many onsets', () => {
    const stabilizer = new BpmStabilizer();
    // Fast tempo compresses many onsets into a short elapsed time.
    const onsets = generateOnsetTimesMs(240, 20);
    const elapsedMs = onsets[onsets.length - 1] ?? 0;
    expect(elapsedMs).toBeLessThan(MIC_MIN_ANALYSIS_MS);

    const output = stabilizer.update(onsets, elapsedMs);
    expect(output.phase).not.toBe('success');
  });

  it('resets its stability history', () => {
    const stabilizer = new BpmStabilizer();
    const onsets = generateOnsetTimesMs(120, 6);
    stabilizer.update(onsets, 3000);
    stabilizer.reset();
    // Immediately after reset, a single new reading can't yet be "stable"
    // even if it matches — the required consecutive-estimate history is gone.
    const output = stabilizer.update(generateOnsetTimesMs(120, 6), 3000);
    expect(output.phase).not.toBe('success');
  });
});
