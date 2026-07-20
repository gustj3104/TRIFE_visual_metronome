import type { OnsetTimesSec } from './types';

export interface ExtractOnsetsOptions {
  frameSize?: number;
  hopSize?: number;
  minOnsetSpacingSec?: number;
  /** Frames on each side used to compute the local adaptive threshold. */
  thresholdWindowRadius?: number;
  /** Multiplier on the local standard deviation added to the local mean flux. */
  thresholdSensitivity?: number;
}

const DEFAULT_FRAME_SIZE = 1024;
const DEFAULT_HOP_SIZE = 512;
const DEFAULT_MIN_SPACING_SEC = 0.1;
const DEFAULT_WINDOW_RADIUS = 20;
const DEFAULT_SENSITIVITY = 1.5;

/**
 * Onset detection via half-wave-rectified energy flux with an adaptive
 * (local mean + k·std) threshold and a minimum-spacing peak picker. Not a
 * full spectral-flux/multi-band detector, but real signal analysis rather
 * than a stand-in — sufficient to find percussive beat onsets in a click
 * track or typical dance-music mix.
 */
export function extractOnsets(
  samples: Float32Array,
  sampleRate: number,
  options: ExtractOnsetsOptions = {},
): OnsetTimesSec {
  const frameSize = options.frameSize ?? DEFAULT_FRAME_SIZE;
  const hopSize = options.hopSize ?? DEFAULT_HOP_SIZE;
  const minSpacingSec = options.minOnsetSpacingSec ?? DEFAULT_MIN_SPACING_SEC;
  const windowRadius = options.thresholdWindowRadius ?? DEFAULT_WINDOW_RADIUS;
  const sensitivity = options.thresholdSensitivity ?? DEFAULT_SENSITIVITY;

  if (samples.length < frameSize || sampleRate <= 0) return [];

  const frameCount = Math.floor((samples.length - frameSize) / hopSize) + 1;
  if (frameCount <= 1) return [];

  const energies = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    const start = i * hopSize;
    let sum = 0;
    for (let j = 0; j < frameSize; j++) {
      const s = samples[start + j] ?? 0;
      sum += s * s;
    }
    energies[i] = Math.sqrt(sum / frameSize);
  }

  const flux = new Float32Array(frameCount);
  for (let i = 1; i < frameCount; i++) {
    const diff = (energies[i] ?? 0) - (energies[i - 1] ?? 0);
    flux[i] = diff > 0 ? diff : 0;
  }

  const minSpacingFrames = Math.max(1, Math.round((minSpacingSec * sampleRate) / hopSize));
  const onsetFrames: number[] = [];
  let lastOnsetFrame = -Infinity;

  for (let i = 0; i < frameCount; i++) {
    const lo = Math.max(0, i - windowRadius);
    const hi = Math.min(frameCount - 1, i + windowRadius);
    let sum = 0;
    let count = 0;
    for (let j = lo; j <= hi; j++) {
      sum += flux[j] ?? 0;
      count++;
    }
    const mean = sum / count;
    let variance = 0;
    for (let j = lo; j <= hi; j++) {
      const d = (flux[j] ?? 0) - mean;
      variance += d * d;
    }
    const std = Math.sqrt(variance / count);
    const threshold = mean + sensitivity * std;

    const value = flux[i] ?? 0;
    const isAboveThreshold = value > threshold && value > 1e-6;
    const isLocalPeak = value >= (flux[i - 1] ?? 0) && value >= (flux[i + 1] ?? 0);

    if (isAboveThreshold && isLocalPeak && i - lastOnsetFrame >= minSpacingFrames) {
      onsetFrames.push(i);
      lastOnsetFrame = i;
    }
  }

  return onsetFrames.map((frame) => (frame * hopSize) / sampleRate);
}
