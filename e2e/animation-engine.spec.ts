import { test, expect } from '@playwright/test';
import { getBpm, getComputedTransform, getStatus, parseMatrixTranslate } from './utils';

test.describe('WAAPI animation engine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('changing BPM from 120 to 180 while playing does not reset position instantly', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(650); // land mid-traversal

    const wrapper = page.getByTestId('bounce-translate-wrapper');
    const before = parseMatrixTranslate(await getComputedTransform(wrapper));

    // A single fast, real DOM "change" event on the range input - not several
    // sequential key presses - keeps elapsed wall-clock time minimal so any
    // large jump can only be explained by a reset, not normal playback.
    await page.locator('input[type="range"]').evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(el, '180');
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const after = parseMatrixTranslate(await getComputedTransform(wrapper));

    expect(await getBpm(page)).toBe(180);
    // Landing solidly mid-traversal (not near 500ms in) makes it virtually
    // impossible for normal continued playback to coincidentally be near
    // either endpoint moments later - only a phase reset would land there.
    expect(before.y).toBeGreaterThan(280);
    expect(before.y).toBeLessThan(720);
    const START_ENDPOINT_Y = 170;
    const END_ENDPOINT_Y = 830;
    expect(Math.abs(after.y - START_ENDPOINT_Y)).toBeGreaterThan(60);
    expect(Math.abs(after.y - END_ENDPOINT_Y)).toBeGreaterThan(60);
  });

  test('after a BPM change, actual movement time matches the new BPM', async ({ page }) => {
    await page.getByTestId('count-mode-4-4').click();
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(100);

    await page.locator('input[type="range"]').evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(el, '180'); // beatDuration = 60000/180 = 333.33ms
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(50);

    const wrapper = page.getByTestId('bounce-translate-wrapper');
    const readY = async () => parseMatrixTranslate(await getComputedTransform(wrapper)).y;

    // Wait until we observe a local direction reversal (an endpoint), then
    // time the gap until the next one - that gap is one real beat duration.
    async function waitForNextEndpoint(): Promise<number> {
      let prev = await readY();
      let prevDelta = 0;
      const start = Date.now();
      while (Date.now() - start < 2000) {
        await page.waitForTimeout(10);
        const cur = await readY();
        const delta = cur - prev;
        if (prevDelta !== 0 && Math.sign(delta) !== Math.sign(prevDelta) && Math.abs(delta) > 0.01) {
          return Date.now();
        }
        prev = cur;
        prevDelta = delta || prevDelta;
      }
      throw new Error('endpoint not detected in time');
    }

    const t1 = await waitForNextEndpoint();
    const t2 = await waitForNextEndpoint();
    const measuredBeatMs = t2 - t1;
    expect(measuredBeatMs).toBeGreaterThan(333.33 * 0.6);
    expect(measuredBeatMs).toBeLessThan(333.33 * 1.6);
  });

  test('panel collapse does not interrupt the running animation', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(100);

    const wrapper = page.getByTestId('bounce-translate-wrapper');
    const beforeCollapse = parseMatrixTranslate(await getComputedTransform(wrapper));

    await page.getByTestId('panel-collapse-button').click();
    await page.waitForTimeout(400);
    const afterCollapse = parseMatrixTranslate(await getComputedTransform(wrapper));
    expect(afterCollapse.y).not.toBeCloseTo(beforeCollapse.y, 1);
    expect(await getStatus(page)).toBe('Playing');

    // It should still be moving (not frozen) after the panel finishes collapsing.
    const sampleA = parseMatrixTranslate(await getComputedTransform(wrapper));
    await page.waitForTimeout(200);
    const sampleB = parseMatrixTranslate(await getComputedTransform(wrapper));
    expect(sampleB.y).not.toBeCloseTo(sampleA.y, 1);
  });

  test('switching visualization type leaves no leftover animation on the old element', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(100);

    const bounceWrapper = page.getByTestId('bounce-translate-wrapper');
    expect(await bounceWrapper.count()).toBe(1);

    await page.getByRole('button', { name: 'Swing', exact: true }).click();
    await page.waitForTimeout(100);

    // The old Bounce wrapper must be gone entirely (unmounted, animation cancelled).
    expect(await bounceWrapper.count()).toBe(0);
    await expect(page.getByTestId('swing-translate-wrapper')).toBeVisible();

    // Confirm no error was thrown by a dangling animation reference and the
    // new visualization is actually animating.
    const swingWrapper = page.getByTestId('swing-translate-wrapper');
    const a = await getComputedTransform(swingWrapper);
    await page.waitForTimeout(300);
    const b = await getComputedTransform(swingWrapper);
    expect(a).not.toBe(b);
  });

  test('pausing freezes the visual position exactly where it was', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(400);

    const wrapper = page.getByTestId('bounce-translate-wrapper');
    await page.getByTestId('play-pause-button').click();
    expect(await getStatus(page)).toBe('Paused');

    const p1 = parseMatrixTranslate(await getComputedTransform(wrapper));
    await page.waitForTimeout(400);
    const p2 = parseMatrixTranslate(await getComputedTransform(wrapper));
    expect(p2.y).toBeCloseTo(p1.y, 1);
  });

  test('pressing play again after a pause restarts from the first beat', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(600); // let it move well past the first beat
    await page.getByTestId('play-pause-button').click();
    expect(await getStatus(page)).toBe('Paused');

    const wrapper = page.getByTestId('bounce-translate-wrapper');
    const pausedY = parseMatrixTranslate(await getComputedTransform(wrapper)).y;

    await page.getByTestId('play-pause-button').click();
    expect(await getStatus(page)).toBe('Playing');

    const restartY = parseMatrixTranslate(await getComputedTransform(wrapper)).y;
    const START_ENDPOINT_Y = 170; // vertical bounce's first beat starts at this endpoint
    // Robust to Playwright round-trip latency: what matters is that restart
    // lands meaningfully closer to the start endpoint than to wherever it
    // was paused, proving it reset rather than resumed mid-flight.
    const distanceToStart = Math.abs(restartY - START_ENDPOINT_Y);
    const distanceToPausedSpot = Math.abs(restartY - pausedY);
    expect(distanceToStart).toBeLessThan(distanceToPausedSpot);

    const countDisplay = page.getByTestId('count-display');
    const firstBeatSpan = countDisplay.locator('span').first();
    await expect(firstBeatSpan).toHaveCSS('opacity', '1');
  });

  test('the panel play/pause button never shows RESUME', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(50);
    await page.getByTestId('play-pause-button').click(); // -> Paused
    await expect(page.getByRole('button', { name: /RESUME/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^PLAY/ })).toBeVisible();
  });
});
