import {
  SIGNAL_CLIPPING_RATIO_TOO_HIGH,
  SIGNAL_CLIPPING_SAMPLE_THRESHOLD,
  SIGNAL_CLIPPING_SMOOTHING_ALPHA,
  SIGNAL_PEAK_DECAY_PER_FRAME,
  SIGNAL_QUALITY_RECOVERY_DWELL_MS,
  SIGNAL_QUALITY_TOO_LOUD_DWELL_MS,
  SIGNAL_QUALITY_TOO_QUIET_DWELL_MS,
  SIGNAL_RMS_TOO_LOW,
} from './constants';

export type SignalQualityLevel = 'ok' | 'too-quiet' | 'too-loud';

export interface SignalQuality {
  level: SignalQualityLevel;
  peakRms: number;
  smoothedClippingRatio: number;
}

function dwellRequiredMsFor(level: SignalQualityLevel): number {
  if (level === 'ok') return SIGNAL_QUALITY_RECOVERY_DWELL_MS;
  if (level === 'too-loud') return SIGNAL_QUALITY_TOO_LOUD_DWELL_MS;
  return SIGNAL_QUALITY_TOO_QUIET_DWELL_MS;
}

/**
 * Tracks whether the raw microphone signal is currently analyzable, apart
 * from whether onsets/tempo candidates are being found at all — a quiet
 * room or a badly clipping input can still produce onsets, but the
 * resulting BPM shouldn't be trusted enough to lock.
 *
 * Two layers of smoothing, addressing two different failure modes:
 * 1. A decaying peak-follower for loudness (not instantaneous per-frame
 *    RMS): percussive beats are brief loud moments amid otherwise quiet
 *    gaps, so a single quiet frame between beats must not read as "too
 *    quiet" on its own.
 * 2. Dwell-time hysteresis on the REPORTED level: even after (1), the raw
 *    computed level could still flip back and forth if the signal hovers
 *    right at a threshold — a level only actually changes once the new
 *    raw reading has persisted for its required dwell time (recovery to
 *    'ok' has its own, shorter, dwell), so the UI-facing level doesn't
 *    flicker ok/too-quiet/ok.
 */
export class SignalQualityTracker {
  private peakRms = 0;
  private smoothedClippingRatio = 0;
  private reportedLevel: SignalQualityLevel = 'ok';
  private pendingLevel: SignalQualityLevel = 'ok';
  private pendingSinceMs = 0;

  update(frame: Float32Array, elapsedMs: number): SignalQuality {
    let sumSquares = 0;
    let clippedCount = 0;
    for (let i = 0; i < frame.length; i++) {
      const s = frame[i] ?? 0;
      sumSquares += s * s;
      if (Math.abs(s) >= SIGNAL_CLIPPING_SAMPLE_THRESHOLD) clippedCount++;
    }
    const rms = Math.sqrt(sumSquares / frame.length);
    this.peakRms = Math.max(rms, this.peakRms * SIGNAL_PEAK_DECAY_PER_FRAME);

    const clippingRatioThisFrame = clippedCount / frame.length;
    this.smoothedClippingRatio =
      this.smoothedClippingRatio * (1 - SIGNAL_CLIPPING_SMOOTHING_ALPHA) +
      clippingRatioThisFrame * SIGNAL_CLIPPING_SMOOTHING_ALPHA;

    let rawLevel: SignalQualityLevel = 'ok';
    if (this.smoothedClippingRatio > SIGNAL_CLIPPING_RATIO_TOO_HIGH) rawLevel = 'too-loud';
    else if (this.peakRms < SIGNAL_RMS_TOO_LOW) rawLevel = 'too-quiet';

    if (rawLevel !== this.pendingLevel) {
      this.pendingLevel = rawLevel;
      this.pendingSinceMs = elapsedMs;
    }
    if (rawLevel !== this.reportedLevel && elapsedMs - this.pendingSinceMs >= dwellRequiredMsFor(rawLevel)) {
      this.reportedLevel = rawLevel;
    }

    return { level: this.reportedLevel, peakRms: this.peakRms, smoothedClippingRatio: this.smoothedClippingRatio };
  }

  reset(): void {
    this.peakRms = 0;
    this.smoothedClippingRatio = 0;
    this.reportedLevel = 'ok';
    this.pendingLevel = 'ok';
    this.pendingSinceMs = 0;
  }
}
