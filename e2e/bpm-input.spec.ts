import { expect, test } from '@playwright/test';
import { start } from './helpers';

test.describe('BPM inline input', () => {
  test('clicking the BPM number enters edit mode', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit BPM' }).click();
    await expect(page.getByRole('spinbutton', { name: 'BPM' })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'BPM' })).toHaveValue('120');
  });

  test('typing 180 and pressing Enter commits the value', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit BPM' }).click();
    const input = page.getByRole('spinbutton', { name: 'BPM' });
    await input.fill('180');
    await input.press('Enter');
    await expect(page.getByRole('button', { name: 'Edit BPM' })).toHaveText('180');
  });

  test('Escape restores the previous BPM without committing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit BPM' }).click();
    const input = page.getByRole('spinbutton', { name: 'BPM' });
    await input.fill('220');
    await input.press('Escape');
    await expect(page.getByRole('button', { name: 'Edit BPM' })).toHaveText('120');
  });

  test('blur commits the value', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit BPM' }).click();
    const input = page.getByRole('spinbutton', { name: 'BPM' });
    await input.fill('90');
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await expect(page.getByRole('button', { name: 'Edit BPM' })).toHaveText('90');
  });

  test('applying a new BPM while playing does not jump the ball position', async ({ page }) => {
    await page.goto('/');
    await start(page);
    await page.waitForTimeout(60);

    // Establish the ball's on-screen speed (px/ms) at the current BPM (120,
    // 500ms/beat) by sampling twice before touching anything.
    const a = await sampleTimeAndPos(page);
    await page.waitForTimeout(60);
    const b = await sampleTimeAndPos(page);
    const rateOld = distance(a.pos, b.pos) / (b.t - a.t);
    expect(rateOld).toBeGreaterThan(0); // sanity: the ball really is moving

    const before = await sampleTimeAndPos(page);
    await page.getByRole('button', { name: 'Edit BPM' }).click();
    const input = page.getByRole('spinbutton', { name: 'BPM' });
    await input.fill('90');
    await input.press('Enter');
    const after = await sampleTimeAndPos(page);

    // A genuine phase-preserving rescale can only move the ball by at most
    // (old speed) x (elapsed time) — a reset-to-start or reset-to-center
    // jump would blow far past this bound regardless of how little time
    // the UI interaction took.
    const elapsed = after.t - before.t;
    const maxExpectedDelta = rateOld * elapsed * 1.5 + 8;
    const actualDelta = distance(before.pos, after.pos);
    expect(actualDelta).toBeLessThanOrEqual(maxExpectedDelta);

    // And the animation's duration really did change: post-commit speed
    // should track the new BPM (90/120 = 0.75x) rather than staying at the
    // old rate or dropping to ~0 (which would mean it got reset/stalled).
    const c = await sampleTimeAndPos(page);
    await page.waitForTimeout(60);
    const d = await sampleTimeAndPos(page);
    const rateNew = distance(c.pos, d.pos) / (d.t - c.t);
    const expectedNewRate = rateOld * 0.75;
    expect(rateNew).toBeGreaterThan(expectedNewRate * 0.4);
    expect(rateNew).toBeLessThan(expectedNewRate * 1.6);
  });

  test('Space is suppressed while the BPM input is focused', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit BPM' }).click();
    const input = page.getByRole('spinbutton', { name: 'BPM' });
    await input.focus();

    await page.keyboard.press('Space');
    await expect(page.getByTestId('status-badge')).toHaveText('READY');

    await input.press('Escape');
    await expect(page.getByRole('button', { name: 'Edit BPM' })).toHaveText('120');
  });

  test('the global arrow-key BPM shortcut does not fire while the BPM input is focused', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit BPM' }).click();
    const input = page.getByRole('spinbutton', { name: 'BPM' });
    await input.focus();

    await page.keyboard.press('ArrowRight');

    // The global shortcut writes straight to the *committed* engine BPM,
    // which is also reflected on the BPM range slider — that must be
    // untouched even if the number input's own native arrow behavior fires.
    await expect(page.locator('input[aria-label="BPM slider"]')).toHaveValue('120');

    await input.press('Escape');
  });
});

interface TimedPos {
  t: number;
  pos: { x: number; y: number };
}

async function sampleTimeAndPos(page: import('@playwright/test').Page): Promise<TimedPos> {
  return page.evaluate(() => {
    const svg = document.querySelector('svg[data-viz="Bounce"]') as SVGSVGElement;
    const circle = svg.querySelector('circle') as SVGCircleElement;
    const p0 = svg.createSVGPoint();
    p0.x = 0;
    p0.y = 0;
    const screen = p0.matrixTransform(circle.getScreenCTM()!);
    return { t: performance.now(), pos: { x: screen.x, y: screen.y } };
  });
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
