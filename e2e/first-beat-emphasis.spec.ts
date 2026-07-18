import { test, expect } from '@playwright/test';
import { getStatus, getBpm, parseScale, parseTranslate } from './utils';

test.describe('First beat emphasis toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('is on by default', async ({ page }) => {
    await expect(page.getByTestId('first-beat-emphasis-toggle')).toHaveAttribute('aria-checked', 'true');
  });

  test('On: the first beat gets extra scale emphasis', async ({ page }) => {
    await page.getByTestId('start-button').click();

    let maxScale = 0;
    for (let i = 0; i < 40; i++) {
      const t = await page.getByTestId('bounce-scale-wrapper').getAttribute('transform');
      maxScale = Math.max(maxScale, parseScale(t));
      await page.waitForTimeout(50);
    }
    // Regular beat flash scales to 1.18; the first beat additionally scales to 1.38.
    expect(maxScale).toBeGreaterThan(1.3);
  });

  test('Off: no extra first-beat scale is applied', async ({ page }) => {
    await page.getByTestId('first-beat-emphasis-toggle').click();
    await expect(page.getByTestId('first-beat-emphasis-toggle')).toHaveAttribute('aria-checked', 'false');
    await page.getByTestId('start-button').click();

    let maxScale = 0;
    for (let i = 0; i < 40; i++) {
      const t = await page.getByTestId('bounce-scale-wrapper').getAttribute('transform');
      maxScale = Math.max(maxScale, parseScale(t));
      await page.waitForTimeout(50);
    }
    // Regular beat emphasis policy is unchanged; only the first-beat boost is gone.
    expect(maxScale).toBeCloseTo(1.18, 2);
  });

  test('Off: position, BPM, and count still work normally', async ({ page }) => {
    await page.getByTestId('first-beat-emphasis-toggle').click();
    await page.getByTestId('start-button').click();

    const before = await page.getByTestId('bounce-translate-wrapper').getAttribute('transform');
    await page.waitForTimeout(300);
    const after = await page.getByTestId('bounce-translate-wrapper').getAttribute('transform');
    expect(after).not.toBe(before);

    expect(await getBpm(page)).toBe(120);
    await expect(page.getByTestId('count-display').locator('span')).toHaveCount(4);
  });

  test('toggling On/Off does not change the ball center coordinates', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(150);
    const onTransform = await page.getByTestId('bounce-translate-wrapper').getAttribute('transform');
    const onPos = parseTranslate(onTransform);

    await page.getByTestId('first-beat-emphasis-toggle').click();
    await page.waitForTimeout(50);
    const offTransform = await page.getByTestId('bounce-translate-wrapper').getAttribute('transform');
    const offPos = parseTranslate(offTransform);

    // x is constant for vertical bounce regardless of emphasis; toggling
    // must not move the ball on its own (only the running clock does).
    expect(offPos.x).toBeCloseTo(onPos.x, 1);
  });

  test('changing the setting does not stop playback or reset the count', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(600);

    await page.getByTestId('first-beat-emphasis-toggle').click();
    await page.waitForTimeout(50);

    expect(await getStatus(page)).toBe('Playing');
    await expect(page.getByTestId('count-display')).toBeVisible();
  });
});
