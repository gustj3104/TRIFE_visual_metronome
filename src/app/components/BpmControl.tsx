import { useEffect, useRef, useState } from 'react';
import { BPM_MAX, BPM_MIN } from '../engine/types';
import { resolveBpmCommit } from '../lib/bpmInput';

interface BpmControlProps {
  bpm: number;
  onCommit: (value: number) => void;
  onWheel: (e: React.WheelEvent) => void;
  tp: string;
}

const DISPLAY_FONT_STYLE: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: '4.55rem',
  fontWeight: 700,
  lineHeight: 1,
  userSelect: 'none',
};

export function BpmControl({ bpm, onCommit, onWheel, tp }: BpmControlProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => String(bpm));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const beginEdit = () => {
    setDraft(String(bpm));
    setEditing(true);
  };

  const commit = () => {
    onCommit(resolveBpmCommit(draft, bpm));
    setEditing(false);
  };

  const cancel = () => {
    setDraft(String(bpm));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={BPM_MIN}
        max={BPM_MAX}
        step={1}
        value={draft}
        aria-label="BPM"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        style={{
          ...DISPLAY_FONT_STYLE,
          color: tp,
          background: 'transparent',
          border: 'none',
          outline: `2px solid ${tp}`,
          outlineOffset: 2,
          borderRadius: 4,
          width: '3.6ch',
          padding: 0,
        }}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Edit BPM"
      onClick={beginEdit}
      onWheel={onWheel}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          beginEdit();
        }
      }}
      style={{ ...DISPLAY_FONT_STYLE, color: tp, cursor: 'text' }}
    >
      {bpm}
    </div>
  );
}
