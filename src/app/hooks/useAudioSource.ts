import { useCallback, useState } from 'react';
import type { AudioSource } from '../audio/types';
import { useAudioFileAnalysis, type UseAudioFileAnalysisResult } from './useAudioFileAnalysis';
import { useMicrophoneBpm, type UseMicrophoneBpmResult } from './useMicrophoneBpm';

export interface UseAudioSourceResult {
  activeSource: AudioSource;
  fileAnalysis: UseAudioFileAnalysisResult;
  microphone: UseMicrophoneBpmResult;
  /** Non-null while the switch-confirmation dialog should be shown. */
  pendingSwitchTarget: AudioSource | null;
  requestSwitch: (target: AudioSource) => void;
  confirmSwitch: () => void;
  cancelSwitch: () => void;
}

function fileHasData(state: UseAudioFileAnalysisResult['state']): boolean {
  return state.status !== 'empty';
}

function microphoneHasData(state: UseMicrophoneBpmResult['state']): boolean {
  return state.status !== 'off';
}

/**
 * Only one of {file, microphone} may be the active source at a time. Leaving
 * a source that still holds a file/result/stream requires confirmation;
 * canceling leaves everything untouched, confirming tears down the source
 * being left (via its own hook's reset/stop) before switching.
 */
export function useAudioSource(currentAppliedBpm: number): UseAudioSourceResult {
  const [activeSource, setActiveSource] = useState<AudioSource>('file');
  const [pendingSwitchTarget, setPendingSwitchTarget] = useState<AudioSource | null>(null);
  const fileAnalysis = useAudioFileAnalysis();
  const microphone = useMicrophoneBpm(currentAppliedBpm);

  const requestSwitch = useCallback(
    (target: AudioSource) => {
      if (target === activeSource) return;

      if (target === 'microphone' && fileHasData(fileAnalysis.state)) {
        setPendingSwitchTarget('microphone');
        return;
      }
      if (target === 'file' && microphoneHasData(microphone.state)) {
        setPendingSwitchTarget('file');
        return;
      }

      setActiveSource(target);
    },
    [activeSource, fileAnalysis.state, microphone.state],
  );

  const confirmSwitch = useCallback(() => {
    if (!pendingSwitchTarget) return;
    if (pendingSwitchTarget === 'microphone') {
      fileAnalysis.removeFile();
    } else {
      microphone.stop();
    }
    setActiveSource(pendingSwitchTarget);
    setPendingSwitchTarget(null);
  }, [pendingSwitchTarget, fileAnalysis, microphone]);

  const cancelSwitch = useCallback(() => {
    setPendingSwitchTarget(null);
  }, []);

  return {
    activeSource,
    fileAnalysis,
    microphone,
    pendingSwitchTarget,
    requestSwitch,
    confirmSwitch,
    cancelSwitch,
  };
}
