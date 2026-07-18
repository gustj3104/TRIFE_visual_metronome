import { test, expect } from '@playwright/test';
import { getBpm, getComputedTransform, getStatus, parseMatrixScaleX, parseMatrixTranslate } from './utils';

test.describe('First beat emphasis toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('is on by default', async ({ page }) => {
    await expect(page.getByTestId('first-beat-emphasis-toggle')).toHaveAttribute('aria-checked', 'true');
  });

  test('On: the first beat gets extra scale emphasis', async ({ page }) => {
    await page.getByTestId('start-button').click();

    const scaleWrapper = page.getByTestId('bounce-scale-wrapper');
    let maxScale = 0;
    for (let i = 0; i < 40; i++) {
      const t = await getComputedTransform(scaleWrapper);
      maxScale = Math.max(maxScale, parseMatrixScaleX(t));
      await page.waitForTimeout(50);
    }
    // Regular beat flash scales to 1.18; the first beat additionally scales to 1.38.
    expect(maxScale).toBeGreaterThan(1.3);
  });

  test('Off: no extra first-beat scale is applied', async ({ page }) => {
    await page.getByTestId('first-beat-emphasis-toggle').click();
    await expect(page.getByTestId('first-beat-emphasis-toggle')).toHaveAttribute('aria-checked', 'false');
    await page.getByTestId('start-button').click();

    const scaleWrapper = page.getByTestId('bounce-scale-wrapper');
    let maxScale = 0;
    for (let i = 0; i < 40; i++) {
      const t = await getComputedTransform(scaleWrapper);
      maxScale = Math.max(maxScale, parseMatrixScaleX(t));
      await page.waitForTimeout(50);
    }
    // Regular beat emphasis policy is unchanged; only the first-beat boost is gone.
    expect(maxScale).toBeCloseTo(1.18, 1);
  });

  test('Off: position, BPM, and count still work normally', async ({ page }) => {
    await page.getByTestId('first-beat-emphasis-toggle').click();
    await page.getByTestId('start-button').click();

    const wrapper = page.getByTestId('bounce-translate-wrapper');
    const before = await getComputedTransform(wrapper);
    await page.waitForTimeout(300);
    const after = await getComputedTransform(wrapper);
    expect(after).not.toBe(before);

    expect(await getBpm(page)).toBe(120);
    await expect(page.getByTestId('count-display').locator('span')).toHaveCount(4);
  });

  test('toggling On/Off does not change the ball center coordinates', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(150);
    const wrapper = page.getByTestId('bounce-translate-wrapper');
    const onPos = parseMatrixTranslate(await getComputedTransform(wrapper));

    await page.getByTestId('first-beat-emphasis-toggle').click();
    await page.waitForTimeout(50);
    const offPos = parseMatrixTranslate(await getComputedTransform(wrapper));

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
