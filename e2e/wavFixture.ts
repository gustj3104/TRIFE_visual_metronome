/** Generates synthetic click-track WAVs in memory (no binary fixtures committed to the repo) for driving the file-upload BPM analysis flow in e2e tests, including a benchmark suite of harder patterns (weak beats, mixed emphasis, syncopation, half-time-ambiguous accents, leading silence, stereo imbalance). */

/**
 * A ~90Hz decaying thump (kick-drum-like), not a high treble click:
 * realtime-bpm-analyzer's analyzeFullBuffer applies a bass-focused lowpass
 * filter (~150Hz default — see getBiquadFilter's docs, "optimized for
 * detecting bass drum kicks") before peak-detecting, so a high-frequency
 * click (the original 1200Hz tone here) gets filtered out almost entirely
 * and rbpm finds no candidates at all — confirmed by instrumenting
 * analyzeFullBuffer's raw return value during benchmark development, which
 * came back `[]` for every case at 1200Hz. The custom engine's onset
 * detector is broadband/RMS-based and doesn't care about tone frequency, so
 * this only affects rbpm's ability to hear the synthetic beat, not the
 * custom engine's.
 */
function placeClick(samples: Float32Array, startSample: number, sampleRate: number, amplitude: number): void {
  const clickLengthSamples = Math.floor(0.08 * sampleRate);
  for (let i = 0; i < clickLengthSamples && startSample + i < samples.length; i++) {
    const decay = Math.exp(-i / (clickLengthSamples * 0.25));
    samples[startSample + i] = (samples[startSample + i] ?? 0) + amplitude * decay * Math.sin((2 * Math.PI * 90 * i) / sampleRate);
  }
}

function generateClickTrackSamples(bpm: number, durationSec: number, sampleRate: number): Float32Array {
  const length = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(length);
  const beatIntervalSec = 60 / bpm;
  for (let t = 0; t < durationSec; t += beatIntervalSec) {
    placeClick(samples, Math.floor(t * sampleRate), sampleRate, 1);
  }
  return samples;
}

/** Every click is quiet (low amplitude) — a weak/distant-sounding beat instead of a sharp transient. */
function generateWeakBeatSamples(bpm: number, durationSec: number, sampleRate: number): Float32Array {
  const length = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(length);
  const beatIntervalSec = 60 / bpm;
  for (let t = 0; t < durationSec; t += beatIntervalSec) {
    placeClick(samples, Math.floor(t * sampleRate), sampleRate, 0.12);
  }
  return samples;
}

/** Alternates a loud downbeat with a quiet upbeat (backbeat-style dynamics) at the same underlying grid. */
function generateMixedEmphasisSamples(bpm: number, durationSec: number, sampleRate: number): Float32Array {
  const length = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(length);
  const beatIntervalSec = 60 / bpm;
  let beatIndex = 0;
  for (let t = 0; t < durationSec; t += beatIntervalSec, beatIndex++) {
    placeClick(samples, Math.floor(t * sampleRate), sampleRate, beatIndex % 2 === 0 ? 1 : 0.3);
  }
  return samples;
}

/** Adds an off-grid syncopated hit slightly ahead of every other downbeat (an "and-of-4" anticipation), on top of the regular grid — the onset timeline is no longer perfectly periodic. */
function generateSyncopatedSamples(bpm: number, durationSec: number, sampleRate: number): Float32Array {
  const length = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(length);
  const beatIntervalSec = 60 / bpm;
  let beatIndex = 0;
  for (let t = 0; t < durationSec; t += beatIntervalSec, beatIndex++) {
    placeClick(samples, Math.floor(t * sampleRate), sampleRate, 1);
    if (beatIndex % 2 === 1) {
      const anticipationSec = t + beatIntervalSec * 0.75;
      placeClick(samples, Math.floor(anticipationSec * sampleRate), sampleRate, 0.6);
    }
  }
  return samples;
}

/** Strong accent every OTHER beat (true grid is `bpm`, but only half the clicks are loud) — the classic pattern that tempts a naive detector into locking onto bpm/2. */
function generateHalfTimeAmbiguousSamples(bpm: number, durationSec: number, sampleRate: number): Float32Array {
  const length = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(length);
  const beatIntervalSec = 60 / bpm;
  let beatIndex = 0;
  for (let t = 0; t < durationSec; t += beatIntervalSec, beatIndex++) {
    placeClick(samples, Math.floor(t * sampleRate), sampleRate, beatIndex % 2 === 0 ? 1 : 0.15);
  }
  return samples;
}

function generateSamplesWithLeadingSilence(
  build: (bpm: number, durationSec: number, sampleRate: number) => Float32Array,
  bpm: number,
  durationSec: number,
  silenceSec: number,
  sampleRate: number,
): Float32Array {
  const silenceSamples = Math.floor(silenceSec * sampleRate);
  const body = build(bpm, durationSec, sampleRate);
  const out = new Float32Array(silenceSamples + body.length);
  out.set(body, silenceSamples);
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  return encodeWavChannels([samples], sampleRate);
}

function encodeWavChannels(channels: Float32Array[], sampleRate: number): Buffer {
  const numberOfChannels = channels.length;
  const frameCount = channels[0]?.length ?? 0;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numberOfChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * blockAlign, 28); // byte rate
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < frameCount; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch]?.[i] ?? 0));
      buffer.writeInt16LE(Math.round(s * 32767), 44 + (i * numberOfChannels + ch) * 2);
    }
  }
  return buffer;
}

export function generateClickTrackWav(bpm: number, durationSec: number, sampleRate = 44100): Buffer {
  return encodeWav(generateClickTrackSamples(bpm, durationSec, sampleRate), sampleRate);
}

export function generateSilentWav(durationSec: number, sampleRate = 44100): Buffer {
  return encodeWav(new Float32Array(Math.floor(durationSec * sampleRate)), sampleRate);
}

export function generateWeakBeatWav(bpm: number, durationSec: number, sampleRate = 44100): Buffer {
  return encodeWav(generateWeakBeatSamples(bpm, durationSec, sampleRate), sampleRate);
}

export function generateMixedEmphasisWav(bpm: number, durationSec: number, sampleRate = 44100): Buffer {
  return encodeWav(generateMixedEmphasisSamples(bpm, durationSec, sampleRate), sampleRate);
}

export function generateSyncopatedWav(bpm: number, durationSec: number, sampleRate = 44100): Buffer {
  return encodeWav(generateSyncopatedSamples(bpm, durationSec, sampleRate), sampleRate);
}

export function generateHalfTimeAmbiguousWav(bpm: number, durationSec: number, sampleRate = 44100): Buffer {
  return encodeWav(generateHalfTimeAmbiguousSamples(bpm, durationSec, sampleRate), sampleRate);
}

export function generateWithLeadingSilenceWav(
  bpm: number,
  durationSec: number,
  silenceSec: number,
  sampleRate = 44100,
): Buffer {
  return encodeWav(
    generateSamplesWithLeadingSilence(generateClickTrackSamples, bpm, durationSec, silenceSec, sampleRate),
    sampleRate,
  );
}

/** Stereo file where the left channel has a normal click track and the right channel is near-silent — simulates a poorly-mixed/mono-source-panned recording where a naive (left+right)/2 downmix would partially cancel or dilute the beat. */
export function generateStereoImbalancedWav(bpm: number, durationSec: number, sampleRate = 44100): Buffer {
  const left = generateClickTrackSamples(bpm, durationSec, sampleRate);
  const right = generateWeakBeatSamples(bpm, durationSec, sampleRate);
  return encodeWavChannels([left, right], sampleRate);
}
