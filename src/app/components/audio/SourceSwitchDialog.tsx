import { useEffect, useRef } from 'react';

interface SourceSwitchDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Focus is restored here once the dialog closes, for any reason. */
  returnFocusRef: React.RefObject<HTMLElement | null>;
  tp: string;
  ts: string;
  panelBg: string;
  pBorder: string;
}

/**
 * Shared confirmation dialog for both switch directions (file→mic,
 * mic→file). Backdrop click is treated the same as Cancel — clicking
 * outside a destructive-action dialog should never trigger the
 * destructive path.
 */
export function SourceSwitchDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  returnFocusRef,
  tp,
  ts,
  panelBg,
  pBorder,
}: SourceSwitchDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onCancel]);

  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (wasOpenRef.current && !open) returnFocusRef.current?.focus();
    wasOpenRef.current = open;
  }, [open, returnFocusRef]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-switch-dialog-title"
        aria-describedby="source-switch-dialog-desc"
        style={{
          background: panelBg,
          border: `1px solid ${pBorder}`,
          borderRadius: 12,
          padding: 20,
          width: 300,
          maxWidth: '88vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <h2
          id="source-switch-dialog-title"
          style={{ color: tp, fontSize: '1rem', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.02em' }}
        >
          {title}
        </h2>
        <p
          id="source-switch-dialog-desc"
          style={{ color: ts, fontSize: '0.82rem', lineHeight: 1.5, margin: '0 0 18px', whiteSpace: 'pre-line' }}
        >
          {description}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            ref={cancelRef}
            onClick={onCancel}
            data-testid="source-switch-cancel"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              background: 'transparent',
              color: ts,
              border: `1px solid ${pBorder}`,
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            data-testid="source-switch-confirm"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              background: '#c23b3b',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
