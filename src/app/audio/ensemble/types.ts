export type TempoCandidate = { bpm: number; count: number; confidence: number };

/** Which engine(s) produced a result. Named 'rbpm' (realtime-bpm-analyzer), not 'essentia' — see decision log in the project plan for why. */
export type BpmEngine = 'custom' | 'rbpm' | 'ensemble';

export interface EngineTempoEstimate {
  engine: 'custom' | 'rbpm';
  /** Native to the engine — custom: already folded into the app's 40-240 range; rbpm: whatever value it returned (rbpm folds to 90-180 internally, opaque to us — never re-interpreted here as if it were canonical). */
  bpm: number;
  /** Ranked candidate list when available (rbpm: its own Tempo[]; custom: a 1-element list synthesized from the winning cluster). */
  rawCandidates: TempoCandidate[];
  /** 0..1 — how much the top candidate dominates the runner-up. custom: reuses estimateBpmFromOnsets' own confidence ratio; rbpm: derived from its candidate counts. */
  dominance: number;
  /** custom: total onset intervals; rbpm: top candidate's peak count. */
  sampleCount: number;
  analyzedDurationSeconds: number;
}

export type EstimateAgreement = 'near' | 'half-double' | 'conflict' | 'single-engine';
