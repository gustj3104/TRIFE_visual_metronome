import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

interface LoadingIndicatorProps {
  text: string;
  tp: string;
  ts: string;
  testId?: string;
}

export function LoadingIndicator({ text, tp, ts, testId }: LoadingIndicatorProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div role="status" aria-live="polite" data-testid={testId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        aria-hidden="true"
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          border: `2px solid ${ts}40`,
          borderTopColor: tp,
          flexShrink: 0,
          animation: reducedMotion ? 'none' : 'audio-spin 0.8s linear infinite',
          opacity: reducedMotion ? 0.9 : 1,
        }}
      />
      <span style={{ color: ts, fontSize: '0.78rem', letterSpacing: '0.06em' }}>{text}</span>
    </div>
  );
}
