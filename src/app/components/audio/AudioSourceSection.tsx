import { useRef, useState } from 'react';
import type { AudioSource } from '../../audio/types';
import type { UseAudioSourceResult } from '../../hooks/useAudioSource';
import { FileSourcePanel } from './FileSourcePanel';
import { MicrophoneSourcePanel } from './MicrophoneSourcePanel';
import { SourceSwitchDialog } from './SourceSwitchDialog';
import { SourceTabs } from './SourceTabs';

interface AudioSourceSectionProps {
  audioSource: UseAudioSourceResult;
  onApplyBpm: (bpm: number) => void;
  tp: string;
  ts: string;
  panelBg: string;
  pBorder: string;
  hov: string;
}

const DIALOG_COPY = {
  microphone: {
    title: 'Switch to microphone?',
    description: 'The selected audio file and its analysis result will be removed.',
    confirmLabel: 'REMOVE & SWITCH',
  },
  file: {
    title: 'Switch to file upload?',
    description: 'Microphone listening will stop and the detected result will be cleared.',
    confirmLabel: 'STOP & SWITCH',
  },
} as const;

export function AudioSourceSection({ audioSource, onApplyBpm, tp, ts, panelBg, pBorder, hov }: AudioSourceSectionProps) {
  const { activeSource, fileAnalysis, microphone, pendingSwitchTarget, requestSwitch, confirmSwitch, cancelSwitch } =
    audioSource;
  const fileTabRef = useRef<HTMLButtonElement>(null);
  const microphoneTabRef = useRef<HTMLButtonElement>(null);

  // The dialog closes by pendingSwitchTarget going back to null in the same
  // render as `open` flips to false — if we unmounted SourceSwitchDialog
  // whenever there's no target, its own true→false close effect (which
  // restores focus) would never get to run. So it stays mounted always, and
  // remembers the last non-null target — via React's documented
  // "adjusting state during render" escape hatch, not a ref — so its
  // copy/focus-return target stay valid through the close.
  const [prevPendingTarget, setPrevPendingTarget] = useState(pendingSwitchTarget);
  const [lastTarget, setLastTarget] = useState<AudioSource>('microphone');
  if (pendingSwitchTarget !== prevPendingTarget) {
    setPrevPendingTarget(pendingSwitchTarget);
    if (pendingSwitchTarget !== null) setLastTarget(pendingSwitchTarget);
  }
  const effectiveTarget = pendingSwitchTarget ?? lastTarget;

  // Focus returns to whichever tab button triggered this dialog — the
  // standard "return focus to the trigger" pattern. That's correct whether
  // the dialog is canceled (that tab wasn't activated, so it's still the
  // logical place to keep acting from) or confirmed (that tab is now the
  // active one).
  const returnFocusRef = effectiveTarget === 'microphone' ? microphoneTabRef : fileTabRef;
  const dialogCopy = DIALOG_COPY[effectiveTarget];

  return (
    <div data-testid="audio-source-section">
      <SourceTabs
        active={activeSource}
        onSelect={requestSwitch}
        tp={tp}
        ts={ts}
        bg={panelBg}
        border={pBorder}
        fileTabRef={fileTabRef}
        microphoneTabRef={microphoneTabRef}
      />

      <div style={{ marginTop: 12 }}>
        {activeSource === 'file' ? (
          <FileSourcePanel
            fileAnalysis={fileAnalysis}
            onApplyBpm={onApplyBpm}
            tp={tp}
            ts={ts}
            panelBg={panelBg}
            pBorder={pBorder}
            hov={hov}
          />
        ) : (
          <MicrophoneSourcePanel
            microphone={microphone}
            onApplyBpm={onApplyBpm}
            tp={tp}
            ts={ts}
            panelBg={panelBg}
            pBorder={pBorder}
            hov={hov}
          />
        )}
      </div>

      <p style={{ color: ts, fontSize: '0.66rem', lineHeight: 1.4, marginTop: 12, opacity: 0.75 }}>
        Audio is analyzed locally in your browser and is not uploaded.
      </p>

      <SourceSwitchDialog
        open={pendingSwitchTarget !== null}
        title={dialogCopy.title}
        description={dialogCopy.description}
        confirmLabel={dialogCopy.confirmLabel}
        onCancel={cancelSwitch}
        onConfirm={confirmSwitch}
        returnFocusRef={returnFocusRef}
        tp={tp}
        ts={ts}
        panelBg={panelBg}
        pBorder={pBorder}
      />
    </div>
  );
}
