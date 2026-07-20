export type TempoEngineMode = 'custom-only' | 'rbpm-only' | 'ensemble';

const VALID_MODES: readonly TempoEngineMode[] = ['custom-only', 'rbpm-only', 'ensemble'];

/** Reads VITE_TEMPO_ENGINE_MODE (dev/debug override only — no secrets, safe to ship in the client bundle), defaulting to 'ensemble'. */
export function getTempoEngineMode(): TempoEngineMode {
  const raw = import.meta.env.VITE_TEMPO_ENGINE_MODE;
  return (VALID_MODES as readonly string[]).includes(raw ?? '') ? (raw as TempoEngineMode) : 'ensemble';
}

/**
 * Comparison log for developers/benchmarking. The console.table is dev-only
 * — never printed in production builds (this is a single-page metronome app;
 * a full debug route/page for a two-engine comparison would be
 * disproportionate to what a developer needs, see the project plan's
 * "Explicitly descoped" section). The last record is also stashed on
 * `window` unconditionally (cheap — a handful of numbers/strings, no PCM or
 * audio data) so an e2e benchmark harness can read it via `page.evaluate`
 * even against a production build, without needing its own separate
 * dev-server-only test project.
 */
export function logEnsembleDebugInfo(info: Record<string, unknown>): void {
  if (typeof window !== 'undefined') {
    (window as unknown as { __tempoEnsembleDebug?: Record<string, unknown> }).__tempoEnsembleDebug = info;
  }
  if (!import.meta.env.DEV) return;
  console.table([info]);
}
