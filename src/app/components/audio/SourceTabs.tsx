import type { AudioSource } from '../../audio/types';

interface SourceTabsProps {
  active: AudioSource;
  onSelect: (source: AudioSource) => void;
  tp: string;
  ts: string;
  bg: string;
  border: string;
  fileTabRef: React.RefObject<HTMLButtonElement | null>;
  microphoneTabRef: React.RefObject<HTMLButtonElement | null>;
}

const TABS: { id: AudioSource; label: string }[] = [
  { id: 'file', label: 'FILE' },
  { id: 'microphone', label: 'MICROPHONE' },
];

export function SourceTabs({ active, onSelect, tp, ts, bg, border, fileTabRef, microphoneTabRef }: SourceTabsProps) {
  const refs = { file: fileTabRef, microphone: microphoneTabRef };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const nextIndex = e.key === 'ArrowRight' ? (index + 1) % TABS.length : (index - 1 + TABS.length) % TABS.length;
    const next = TABS[nextIndex];
    if (!next) return;
    refs[next.id].current?.focus();
    onSelect(next.id);
  };

  return (
    <div role="tablist" aria-label="Audio source" style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${border}` }}>
      {TABS.map((tab, index) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            ref={refs[tab.id]}
            role="tab"
            id={`source-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`source-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            data-testid={`source-tab-${tab.id}`}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            style={{
              flex: 1,
              padding: '7px 4px',
              fontSize: '0.864rem',
              border: 'none',
              cursor: 'pointer',
              background: selected ? tp : 'transparent',
              color: selected ? bg : ts,
              fontWeight: selected ? 700 : 400,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
