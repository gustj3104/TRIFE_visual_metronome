import type { Locator, Page } from '@playwright/test';

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

/**
 * Position/scale wrappers are now driven by the Web Animations API, which
 * animates the CSS `transform` property (visible via getComputedStyle) -
 * NOT the SVG `transform` presentation attribute, which stays unset. Tests
 * must read the computed matrix, not `getAttribute('transform')`.
 */
export async function getComputedTransform(locator: Locator): Promise<string> {
  return locator.evaluate((el) => getComputedStyle(el).transform);
}

function parseMatrix(matrix: string): number[] {
  if (matrix === 'none') return [1, 0, 0, 1, 0, 0];
  const m = matrix.match(/matrix\(([^)]+)\)/);
  if (!m) throw new Error(`Could not parse computed transform matrix from "${matrix}"`);
  return m[1].split(',').map((n) => parseFloat(n.trim()));
}

/** Reads the (x, y) translation out of a computed CSS transform matrix. */
export function parseMatrixTranslate(matrix: string): { x: number; y: number } {
  const [, , , , tx, ty] = parseMatrix(matrix);
  return { x: tx, y: ty };
}

/** Reads the x-axis scale factor (matrix `a` component) out of a computed CSS transform matrix. */
export function parseMatrixScaleX(matrix: string): number {
  const [a] = parseMatrix(matrix);
  return a;
}
