import type { Page } from '@playwright/test';

export type MetronomeStatus = 'Ready' | 'Playing' | 'Paused';

/**
 * The Ready/Playing/Paused status is derived from elements in the visual
 * area (start button + play/pause button + its aria-label), since those
 * stay in the DOM regardless of whether the control panel is open.
 */
export async function getStatus(page: Page): Promise<MetronomeStatus> {
  if (await page.getByTestId('start-button').isVisible().catch(() => false)) {
    return 'Ready';
  }
  const label = await page.getByTestId('play-pause-button').getAttribute('aria-label');
  return label === 'Pause metronome' ? 'Playing' : 'Paused';
}

export async function getBpm(page: Page): Promise<number> {
  const text = await page.getByTestId('bpm-display').textContent();
  return Number(text?.trim());
}

export function parseTranslate(transform: string | null): { x: number; y: number } {
  const m = transform?.match(/translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
  if (!m) throw new Error(`Could not parse translate() from "${transform}"`);
  return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
}

export function parseScale(transform: string | null): number {
  const m = transform?.match(/scale\(\s*([-\d.]+)\s*\)/);
  if (!m) throw new Error(`Could not parse scale() from "${transform}"`);
  return parseFloat(m[1]);
}
