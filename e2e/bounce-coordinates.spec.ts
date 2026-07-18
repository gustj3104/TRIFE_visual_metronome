import { test, expect } from '@playwright/test';
import { getComputedTransform, parseMatrixTranslate } from './utils';

async function sampleTranslates(page: import('@playwright/test').Page, count: number, intervalMs: number) {
  const samples: { x: number; y: number }[] = [];
  const wrapper = page.getByTestId('bounce-translate-wrapper');
  for (let i = 0; i < count; i++) {
    const t = await getComputedTransform(wrapper);
    samples.push(parseMatrixTranslate(t));
    await page.waitForTimeout(intervalMs);
  }
  return samples;
}

test.describe('Bounce coordinate stability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Direction is Vertical by default.
  });

  test('vertical bounce: x center stays constant before/after animating', async ({ page }) => {
    await page.getByTestId('start-button').click();
    const samples = await sampleTranslates(page, 20, 40);
    for (const s of samples) {
      expect(s.x).toBeCloseTo(500, 1);
    }
  });

  test('vertical bounce: x center stays constant with first beat emphasis On', async ({ page }) => {
    await expect(page.getByTestId('first-beat-emphasis-toggle')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('start-button').click();
    const samples = await sampleTranslates(page, 20, 40);
    for (const s of samples) {
      expect(s.x).toBeCloseTo(500, 1);
    }
  });

  test('vertical bounce: x center stays constant with first beat emphasis Off', async ({ page }) => {
    await page.getByTestId('first-beat-emphasis-toggle').click();
    await page.getByTestId('start-button').click();
    const samples = await sampleTranslates(page, 20, 40);
    for (const s of samples) {
      expect(s.x).toBeCloseTo(500, 1);
    }
  });

  test('horizontal bounce: y center stays constant before/after animating', async ({ page }) => {
    await page.getByRole('button', { name: 'Horiz.' }).click();
    await page.getByTestId('start-button').click();
    const samples = await sampleTranslates(page, 20, 40);
    for (const s of samples) {
      expect(s.y).toBeCloseTo(500, 1);
    }
  });

  test('horizontal bounce: y center stays constant regardless of first beat emphasis', async ({ page }) => {
    await page.getByRole('button', { name: 'Horiz.' }).click();

    await page.getByTestId('start-button').click();
    let samples = await sampleTranslates(page, 15, 40);
    for (const s of samples) expect(s.y).toBeCloseTo(500, 1);

    await page.getByTestId('first-beat-emphasis-toggle').click();
    samples = await sampleTranslates(page, 15, 40);
    for (const s of samples) expect(s.y).toBeCloseTo(500, 1);
  });
});
