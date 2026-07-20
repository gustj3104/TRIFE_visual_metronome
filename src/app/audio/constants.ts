import { BPM_MAX, BPM_MIN } from '../engine/types';

// Re-exported under audio-domain names so this module doesn't need to know
// the metronome engine's BPM range comes from `engine/types` — analysis code
// only cares that it matches whatever range the engine accepts.
export const MIN_BPM = BPM_MIN;
export const MAX_BPM = BPM_MAX;

export const MAX_AUDIO_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'] as const;

export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/vorbis',
] as const;

export const ACCEPT_ATTRIBUTE = [...SUPPORTED_AUDIO_MIME_TYPES, ...SUPPORTED_AUDIO_EXTENSIONS].join(',');

// BPM candidate clustering
export const CLUSTER_TOLERANCE_BPM = 2;
export const MIN_ONSETS_FOR_ESTIMATE = 2;

// File analysis: long files are sampled in up to three windows (start, middle,
// end) rather than analyzed in full, to bound memory/CPU on very long tracks.
export const FILE_SEGMENT_LENGTH_SEC = 25;
export const FILE_FULL_ANALYSIS_MAX_SEC = 60;
export const FILE_MIN_USABLE_DURATION_SEC = 1.5;

// Microphone live stabilization policy
export const MIC_MIN_ANALYSIS_MS = 6_000;
export const MIC_TARGET_ANALYSIS_MS = 10_000;
export const MIC_MAX_ANALYSIS_MS = 22_000;
export const MIC_MIN_ONSET_COUNT = 8;
export const MIC_STABILITY_TOLERANCE_BPM = 2;
export const MIC_REQUIRED_STABLE_ESTIMATES = 3;
export const MIC_SIGNAL_TOO_LOW_ONSET_FLOOR = 4;

// Live signal quality gating (independent of onset/tempo detection — a
// quiet room or clipping input can still produce onsets, but the resulting
// BPM shouldn't be trusted enough to lock).
export const SIGNAL_RMS_TOO_LOW = 0.02;
export const SIGNAL_CLIPPING_RATIO_TOO_HIGH = 0.05;
/** Decaying peak-follower rate — ~1s to decay to ~74% at 60fps, so a single quiet frame between percussive beats doesn't read as "too quiet". */
export const SIGNAL_PEAK_DECAY_PER_FRAME = 0.995;
export const SIGNAL_CLIPPING_SMOOTHING_ALPHA = 0.1;
export const SIGNAL_CLIPPING_SAMPLE_THRESHOLD = 0.98;
/**
 * Dwell-time hysteresis for the REPORTED signal quality level (separate from
 * the peak-follower/EMA smoothing above): a single bad-quality reading must
 * persist this long before it's actually reported, and recovery to 'ok' has
 * its own (shorter) dwell — this is what stops the level from flickering
 * ok/too-quiet/ok when the raw signal hovers right at a threshold.
 */
export const SIGNAL_QUALITY_TOO_QUIET_DWELL_MS = 2_000;
/** Clipping is more clearly a real problem the instant it's sustained at all, so it needs a shorter dwell than "too quiet" before being reported. */
export const SIGNAL_QUALITY_TOO_LOUD_DWELL_MS = 500;
export const SIGNAL_QUALITY_RECOVERY_DWELL_MS = 1_000;
