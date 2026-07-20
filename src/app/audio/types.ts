import type { BpmEngine, EngineTempoEstimate } from './ensemble/types';
import type { SignalQualityLevel } from './signalQuality';

export type AudioSource = 'file' | 'microphone';

export interface BpmDetectionResult {
  bpm: number;
  confidence: number;
  halfBpm: number | null;
  doubleBpm: number | null;
  source: AudioSource;
  /**
   * Which engine(s) actually produced this result — 'custom' when rbpm was
   * unavailable/failed. Optional (not just for new code, but so the
   * untouched `buildBpmDetectionResult` in bpmCandidates.ts — which predates
   * the ensemble and always means 'custom' — keeps compiling unmodified);
   * absent is equivalent to 'custom'.
   */
  engine?: BpmEngine;
  /** Per-engine raw estimates behind this result, for dev-only debug display — never all shown in the default UI. Absent/empty for pre-ensemble results. */
  estimates?: EngineTempoEstimate[];
  /** The other plausible tempo when the engines disagreed by exactly one octave (half-double). */
  alternativeBpm?: number | null;
}

/** Sub-phase shown while `status: 'analyzing'` — lets the UI say "FINALIZING…" for the last bit of work without adding a fourth top-level status. */
export type FileAnalysisStage = 'beats' | 'finalizing';

export type FileAnalysisState =
  | { status: 'empty' }
  | { status: 'decoding'; file: File }
  | { status: 'analyzing'; file: File; stage: FileAnalysisStage }
  | { status: 'success'; file: File; result: BpmDetectionResult }
  | { status: 'error'; file: File | null; message: string };

export type MicrophoneState =
  | { status: 'off' }
  | { status: 'requesting-permission' }
  | { status: 'listening'; startedAt: number; signalQuality?: SignalQualityLevel }
  | { status: 'stabilizing'; startedAt: number; candidateBpm: number | null; signalQuality?: SignalQualityLevel }
  | { status: 'success'; result: BpmDetectionResult }
  | { status: 'error'; message: string };

/** A single detected onset, in seconds from the start of the analyzed signal. */
export type OnsetTimesSec = number[];

export interface BpmEstimate {
  bpm: number;
  confidence: number;
  clusterSize: number;
  totalIntervals: number;
}
