import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeAudioBufferEstimate } from '../audio/analyzeAudioBuffer';
import { closeAudioContextIfNotClosed } from '../audio/cleanup';
import {
  FILE_FULL_ANALYSIS_MAX_SEC,
  MAX_AUDIO_FILE_SIZE_BYTES,
  SUPPORTED_AUDIO_EXTENSIONS,
  SUPPORTED_AUDIO_MIME_TYPES,
} from '../audio/constants';
import { calculateConfidence, confidenceLevelToNumber } from '../audio/ensemble/calculateConfidence';
import { chooseFinalTempo } from '../audio/ensemble/chooseFinalTempo';
import { resolveAgreement } from '../audio/ensemble/compareEstimates';
import { FAMILY_REPEAT_REQUIRED_FOR_HIGH } from '../audio/ensemble/constants';
import type { EngineTempoEstimate } from '../audio/ensemble/types';
import { FileAnalysisError, fileErrorMessage, type FileAnalysisErrorCode } from '../audio/errors';
import { doubleBpmCandidate, halfBpmCandidate } from '../audio/bpmCandidates';
import { analyzeFileWithRbpm } from '../audio/rbpm/rbpmFileAnalyzer';
import type { BpmDetectionResult, BpmEstimate, FileAnalysisState } from '../audio/types';
import { getTempoEngineMode, logEnsembleDebugInfo } from '../lib/tempoEngineMode';

export interface UseAudioFileAnalysisResult {
  state: FileAnalysisState;
  /** Known once decoding succeeds; independent of whether analysis itself later succeeds. */
  durationSec: number | null;
  selectFile: (file: File) => void;
  removeFile: () => void;
}

function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const hasSupportedExtension = SUPPORTED_AUDIO_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasSupportedMime = file.type !== '' && (SUPPORTED_AUDIO_MIME_TYPES as readonly string[]).includes(file.type);
  return hasSupportedExtension || hasSupportedMime;
}

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function getAudioContextCtor(): typeof AudioContext {
  const ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ctor) throw new FileAnalysisError('decode-failed');
  return ctor;
}

function toCustomEngineEstimate(estimate: BpmEstimate, analyzedDurationSeconds: number): EngineTempoEstimate {
  return {
    engine: 'custom',
    bpm: estimate.bpm,
    rawCandidates: [{ bpm: estimate.bpm, count: estimate.clusterSize, confidence: estimate.confidence }],
    dominance: estimate.confidence,
    sampleCount: estimate.totalIntervals,
    analyzedDurationSeconds,
  };
}

/**
 * File analysis is a single pass, not a live time series — the closest
 * equivalent to "did recent windows repeat the same family" (see
 * calculateConfidence.ts) is whether the file was long enough that BOTH
 * engines independently analyzed multiple (start/middle/end) segments and
 * still combined into one answer, rather than a single ~few-second guess.
 * Short files are capped below the repetition bar required for High
 * confidence — a deliberate, documented degradation (see the project plan).
 */
function fileFamilyRepeatCount(durationSec: number): number {
  return durationSec > FILE_FULL_ANALYSIS_MAX_SEC ? FAMILY_REPEAT_REQUIRED_FOR_HIGH : 1;
}

/**
 * Owns file selection, local (never uploaded) decode + BPM analysis, and
 * invalidation of stale async results via a generation counter — if a newer
 * `selectFile`/`removeFile` call happens while a previous decode/analysis is
 * still in flight, the older one's eventual result is silently dropped.
 */
export function useAudioFileAnalysis(): UseAudioFileAnalysisResult {
  const [state, setState] = useState<FileAnalysisState>({ status: 'empty' });
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const generationRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(
    () => () => {
      closeAudioContextIfNotClosed(audioContextRef.current);
    },
    [],
  );

  const removeFile = useCallback(() => {
    generationRef.current += 1;
    closeAudioContextIfNotClosed(audioContextRef.current);
    audioContextRef.current = null;
    setDurationSec(null);
    setState({ status: 'empty' });
  }, []);

  const selectFile = useCallback((file: File) => {
    if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
      generationRef.current += 1;
      setDurationSec(null);
      setState({ status: 'error', file, message: fileErrorMessage('file-too-large') });
      return;
    }
    if (!isSupportedFile(file)) {
      generationRef.current += 1;
      setDurationSec(null);
      setState({ status: 'error', file, message: fileErrorMessage('unsupported-type') });
      return;
    }

    const generation = ++generationRef.current;
    setDurationSec(null);
    setState({ status: 'decoding', file });

    void (async () => {
      let buffer: AudioBuffer;
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (generationRef.current !== generation) return;
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (getAudioContextCtor())();
        }
        buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      } catch {
        if (generationRef.current !== generation) return;
        setState({ status: 'error', file, message: fileErrorMessage('decode-failed') });
        return;
      }
      if (generationRef.current !== generation) return;
      setDurationSec(buffer.duration);

      setState({ status: 'analyzing', file, stage: 'beats' });
      await yieldToMainThread();
      if (generationRef.current !== generation) return;

      const mode = getTempoEngineMode();

      // Custom engine runs first (as before) — the two engines are run
      // SEQUENTIALLY, not concurrently via Promise.all, since both are
      // CPU-heavy main-thread work and async concurrency isn't thread
      // concurrency; racing them would only make blocking worse.
      let customEstimate: EngineTempoEstimate | null = null;
      let customErrorCode: FileAnalysisErrorCode | null = null;
      if (mode !== 'rbpm-only') {
        try {
          customEstimate = toCustomEngineEstimate(analyzeAudioBufferEstimate(buffer), buffer.duration);
        } catch (err) {
          customErrorCode = err instanceof FileAnalysisError ? err.code : 'decode-failed';
        }
      }
      if (generationRef.current !== generation) return;

      let rbpmEstimate: EngineTempoEstimate | null = null;
      if (mode !== 'custom-only') {
        await yieldToMainThread();
        if (generationRef.current !== generation) return;
        try {
          rbpmEstimate = await analyzeFileWithRbpm(buffer, customEstimate?.bpm ?? null);
        } catch {
          rbpmEstimate = null; // rbpm failure must not sink the custom result
        }
      }
      if (generationRef.current !== generation) return;

      if (!customEstimate && !rbpmEstimate) {
        setState({ status: 'error', file, message: fileErrorMessage(customErrorCode ?? 'no-stable-bpm') });
        return;
      }

      const agreement = resolveAgreement(customEstimate, rbpmEstimate);
      const { bpm, alternativeBpm } = chooseFinalTempo(customEstimate, rbpmEstimate, agreement);
      const confidenceLevel = calculateConfidence({
        agreement,
        custom: customEstimate,
        rbpm: rbpmEstimate,
        familyRepeatCount: fileFamilyRepeatCount(buffer.duration),
      });
      const engine = customEstimate && rbpmEstimate ? 'ensemble' : customEstimate ? 'custom' : 'rbpm';
      const estimates = [customEstimate, rbpmEstimate].filter((e): e is EngineTempoEstimate => e !== null);

      const result: BpmDetectionResult = {
        bpm,
        confidence: confidenceLevelToNumber(confidenceLevel),
        halfBpm: halfBpmCandidate(bpm),
        doubleBpm: doubleBpmCandidate(bpm),
        source: 'file',
        engine,
        estimates,
        alternativeBpm,
      };

      logEnsembleDebugInfo({
        file: file.name,
        customBpm: customEstimate?.bpm ?? null,
        rbpmBpm: rbpmEstimate?.bpm ?? null,
        finalBpm: bpm,
        agreement,
        confidenceLevel,
      });

      setState({ status: 'analyzing', file, stage: 'finalizing' });
      await yieldToMainThread();
      if (generationRef.current !== generation) return;

      setState({ status: 'success', file, result });
    })();
  }, []);

  return { state, durationSec, selectFile, removeFile };
}
