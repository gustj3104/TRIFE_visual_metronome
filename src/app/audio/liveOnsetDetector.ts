export interface LiveOnsetDetectorOptions {
  minOnsetSpacingMs?: number;
  /** Number of recent frames kept to compute the adaptive flux threshold. */
  historySize?: number;
  sensitivity?: number;
}

const DEFAULT_MIN_SPACING_MS = 200;
const DEFAULT_HISTORY_SIZE = 43;
const DEFAULT_SENSITIVITY = 1.5;
const MIN_HISTORY_BEFORE_DETECTING = 8;

/**
 * Streaming counterpart to `extractOnsets`: fed one PCM frame at a time
 * (e.g. from `AnalyserNode.getFloatTimeDomainData`) instead of a whole
 * buffer, using the same half-wave-rectified energy-flux idea with a
 * rolling adaptive threshold.
 */
export class LiveOnsetDetector {
  private readonly minOnsetSpacingMs: number;
  private readonly historySize: number;
  private readonly sensitivity: number;
  private fluxHistory: number[] = [];
  private lastEnergy = 0;
  private lastOnsetAtMs = -Infinity;
  readonly onsetTimesMs: number[] = [];

  constructor(options: LiveOnsetDetectorOptions = {}) {
    this.minOnsetSpacingMs = options.minOnsetSpacingMs ?? DEFAULT_MIN_SPACING_MS;
    this.historySize = options.historySize ?? DEFAULT_HISTORY_SIZE;
    this.sensitivity = options.sensitivity ?? DEFAULT_SENSITIVITY;
  }

  /** Feeds one frame at `elapsedMs` (ms since listening started). Returns true if this frame was detected as an onset. */
  pushFrame(frame: Float32Array, elapsedMs: number): boolean {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      const s = frame[i] ?? 0;
      sum += s * s;
    }
    const energy = Math.sqrt(sum / frame.length);
    const flux = Math.max(0, energy - this.lastEnergy);
    this.lastEnergy = energy;

    this.fluxHistory.push(flux);
    if (this.fluxHistory.length > this.historySize) this.fluxHistory.shift();

    const mean = this.fluxHistory.reduce((a, b) => a + b, 0) / this.fluxHistory.length;
    const variance = this.fluxHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / this.fluxHistory.length;
    const std = Math.sqrt(variance);
    const threshold = mean + this.sensitivity * std;

    const isOnset =
      flux > threshold &&
      flux > 1e-6 &&
      this.fluxHistory.length >= Math.min(MIN_HISTORY_BEFORE_DETECTING, this.historySize) &&
      elapsedMs - this.lastOnsetAtMs >= this.minOnsetSpacingMs;

    if (isOnset) {
      this.lastOnsetAtMs = elapsedMs;
      this.onsetTimesMs.push(elapsedMs);
      return true;
    }
    return false;
  }

  reset(): void {
    this.fluxHistory = [];
    this.lastEnergy = 0;
    this.lastOnsetAtMs = -Infinity;
    this.onsetTimesMs.length = 0;
  }
}
