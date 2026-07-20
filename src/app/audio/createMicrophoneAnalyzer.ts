import { closeAudioContextIfNotClosed, stopMediaStreamTracks } from './cleanup';
import type { EngineTempoEstimate } from './ensemble/types';
import { mapGetUserMediaError, MicrophoneAnalysisError } from './errors';
import { LiveOnsetDetector } from './liveOnsetDetector';
import { createRbpmLiveAnalyzer, type RbpmLiveAnalyzerHandle } from './rbpm/rbpmLiveAnalyzer';
import { SignalQualityTracker, type SignalQuality } from './signalQuality';

export interface MicrophoneAnalyzerCallbacks {
  onFrame: (onsetTimesMs: number[], elapsedMs: number, signalQuality: SignalQuality) => void;
  /** Omit to skip starting the rbpm engine entirely (e.g. custom-only mode). */
  onRbpmEstimate?: (estimate: EngineTempoEstimate, stable: boolean) => void;
  onRbpmError?: (error: unknown) => void;
}

export interface MicrophoneAnalyzerHandle {
  stop: () => void;
  /** Clears accumulated onset history and restarts the elapsed-time origin, without touching the underlying stream/nodes — lets "listen again" resume analysis without a fresh permission/stream round-trip. */
  reset: () => void;
}

const ANALYSER_FFT_SIZE = 2048;

async function requestMicrophoneStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
  } catch {
    // Constraints unsupported or rejected for a reason unrelated to the
    // constraints themselves (e.g. permission) — retry with a plain
    // request so a real permission/device error surfaces below.
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (fallbackErr) {
      throw mapGetUserMediaError(fallbackErr);
    }
  }
}

/**
 * Requests the microphone, wires it into an AnalyserNode, and polls it via
 * rAF, feeding each frame to a `LiveOnsetDetector` and reporting the
 * accumulated onset timeline back to the caller. All permission/device
 * errors are normalized to `MicrophoneAnalysisError`. The returned handle's
 * `stop()` performs full teardown (rAF, node disconnect, track stop,
 * AudioContext close) and is idempotent.
 */
export async function createMicrophoneAnalyzer(
  callbacks: MicrophoneAnalyzerCallbacks,
): Promise<MicrophoneAnalyzerHandle> {
  if (typeof window === 'undefined' || !window.isSecureContext) {
    throw new MicrophoneAnalysisError('insecure-context');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MicrophoneAnalysisError('unsupported');
  }

  const stream = await requestMicrophoneStream();

  const AudioContextCtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    stopMediaStreamTracks(stream);
    throw new MicrophoneAnalysisError('audio-context-failed');
  }

  let audioContext: AudioContext;
  let sourceNode: MediaStreamAudioSourceNode;
  let analyser: AnalyserNode;
  try {
    audioContext = new AudioContextCtor();
    sourceNode = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = ANALYSER_FFT_SIZE;
    sourceNode.connect(analyser);
  } catch {
    stopMediaStreamTracks(stream);
    throw new MicrophoneAnalysisError('audio-context-failed');
  }

  // Taps the SAME sourceNode as the analyser above — no second
  // getUserMedia/AudioContext — so the ensemble's second engine shares this
  // module's stream/context lifecycle rather than owning its own.
  let rbpmHandle: RbpmLiveAnalyzerHandle | null = null;
  if (callbacks.onRbpmEstimate) {
    rbpmHandle = await createRbpmLiveAnalyzer(audioContext, sourceNode, {
      onEstimate: callbacks.onRbpmEstimate,
      onError: callbacks.onRbpmError ?? (() => {}),
    });
  }

  const detector = new LiveOnsetDetector();
  const signalQualityTracker = new SignalQualityTracker();
  const dataArray = new Float32Array(analyser.fftSize);
  let startTime = performance.now();
  let disposed = false;
  let rafId = 0;

  const loop = () => {
    if (disposed) return;
    analyser.getFloatTimeDomainData(dataArray);
    const elapsedMs = performance.now() - startTime;
    detector.pushFrame(dataArray, elapsedMs);
    const signalQuality = signalQualityTracker.update(dataArray, elapsedMs);
    callbacks.onFrame(detector.onsetTimesMs.slice(), elapsedMs, signalQuality);
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);

  return {
    stop: () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(rafId);
      try {
        sourceNode.disconnect();
        analyser.disconnect();
      } catch {
        // Already disconnected — nothing to do.
      }
      rbpmHandle?.stop();
      stopMediaStreamTracks(stream);
      closeAudioContextIfNotClosed(audioContext);
    },
    reset: () => {
      detector.reset();
      signalQualityTracker.reset();
      startTime = performance.now();
      rbpmHandle?.reset();
    },
  };
}
