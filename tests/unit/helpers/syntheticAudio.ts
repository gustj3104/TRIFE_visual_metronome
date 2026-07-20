/** Generates a mono click track with short decaying percussive impulses at an exact BPM — enough signal for the energy-flux onset detector to find real onsets, not a stand-in for one. */
export function generateClickTrack(bpm: number, durationSec: number, sampleRate = 44100): Float32Array {
  const length = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(length);
  const beatIntervalSec = 60 / bpm;
  const clickLengthSamples = Math.floor(0.02 * sampleRate);

  for (let t = 0; t < durationSec; t += beatIntervalSec) {
    const startSample = Math.floor(t * sampleRate);
    for (let i = 0; i < clickLengthSamples && startSample + i < length; i++) {
      const decay = Math.exp(-i / (clickLengthSamples * 0.25));
      const sample = samples[startSample + i] ?? 0;
      samples[startSample + i] = sample + decay * Math.sin((2 * Math.PI * 1200 * i) / sampleRate);
    }
  }
  return samples;
}

export function generateSilence(durationSec: number, sampleRate = 44100): Float32Array {
  return new Float32Array(Math.floor(durationSec * sampleRate));
}

/** Onset timestamps (ms) for a perfectly steady beat, e.g. for feeding a `BpmStabilizer` directly without going through a full onset detector. */
export function generateOnsetTimesMs(bpm: number, count: number): number[] {
  const intervalMs = 60000 / bpm;
  return Array.from({ length: count }, (_, i) => Math.round(i * intervalMs));
}
