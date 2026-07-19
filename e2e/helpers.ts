import type { Page } from '@playwright/test';

/** Starts a MutationObserver on the current viz's emphasis wrapper, logging
 * every data-emphasis-state change with a high-resolution timestamp. Must be
 * called before playback starts so the very first beat is captured. */
export async function startEmphasisLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __emphasisLog: { state: string; t: number }[] };
    w.__emphasisLog = [];
    const target = document.querySelector('[data-testid="emphasis-wrapper"]');
    if (!target) throw new Error('emphasis-wrapper not found');
    const start = performance.now();
    w.__emphasisLog.push({ state: target.getAttribute('data-emphasis-state') ?? 'none', t: 0 });
    const observer = new MutationObserver(() => {
      w.__emphasisLog.push({
        state: target.getAttribute('data-emphasis-state') ?? 'none',
        t: performance.now() - start,
      });
    });
    observer.observe(target, { attributes: true, attributeFilter: ['data-emphasis-state'] });
    (window as unknown as { __emphasisObserver: MutationObserver }).__emphasisObserver = observer;
  });
}

export async function readEmphasisLog(page: Page): Promise<{ state: string; t: number }[]> {
  return page.evaluate(() => (window as unknown as { __emphasisLog: { state: string; t: number }[] }).__emphasisLog);
}

export async function setBpmViaSlider(page: Page, bpm: number): Promise<void> {
  await page.locator('input[aria-label="BPM slider"]').fill(String(bpm));
}

export async function start(page: Page): Promise<void> {
  await page.getByTestId('cta-button').click();
}

export async function pause(page: Page): Promise<void> {
  await page.getByTestId('cta-button').click();
}

export async function selectViz(page: Page, viz: 'Bounce' | 'Swing' | 'Pulse' | 'Sweep'): Promise<void> {
  await page.getByRole('button', { name: viz, exact: true }).click();
}

export async function selectCountMode(page: Page, mode: '4 / 4' | '8 Count'): Promise<void> {
  await page.getByTestId('count-mode-section').getByRole('button', { name: mode, exact: true }).click();
}

export interface SwingPoints {
  lineEnd: { x: number; y: number };
  bobCenter: { x: number; y: number };
}

/** Reads the current on-screen coordinates of the swing line's endpoint and
 * the bob's center via the SVG CTM — the same-pixel assertion this whole
 * bugfix is about. */
export async function readSwingConnectionPoints(page: Page): Promise<SwingPoints> {
  return page.evaluate(() => {
    const svg = document.querySelector('svg[data-viz="Swing"]') as SVGSVGElement;
    const line = document.querySelector('[data-testid="swing-line"]') as SVGLineElement;
    const bob = document.querySelector('[data-testid="swing-bob"]') as SVGCircleElement;
    const x2 = parseFloat(line.getAttribute('x2') ?? '0');
    const y2 = parseFloat(line.getAttribute('y2') ?? '0');
    const p = svg.createSVGPoint();
    p.x = x2;
    p.y = y2;
    const lineEndScreen = p.matrixTransform(line.getScreenCTM()!);
    const p0 = svg.createSVGPoint();
    p0.x = 0;
    p0.y = 0;
    const bobCenterScreen = p0.matrixTransform(bob.getScreenCTM()!);
    return {
      lineEnd: { x: lineEndScreen.x, y: lineEndScreen.y },
      bobCenter: { x: bobCenterScreen.x, y: bobCenterScreen.y },
    };
  });
}
