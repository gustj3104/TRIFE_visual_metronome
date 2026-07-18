import { test, expect } from '@playwright/test';
import { getComputedTransform, getStatus } from './utils';

test.describe('Start button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clicking Start enters Playing state', async ({ page }) => {
    await page.getByTestId('start-button').click();
    expect(await getStatus(page)).toBe('Playing');
    await expect(page.getByText('PLAYING')).toBeVisible();
  });

  test('the play icon becomes a pause icon', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await expect(page.getByTestId('play-pause-button')).toHaveAttribute('aria-label', 'Pause metronome');
  });

  test('the metronome visual starts moving', async ({ page }) => {
    await page.getByTestId('start-button').click();
    const wrapper = page.getByTestId('bounce-translate-wrapper');
    const before = await getComputedTransform(wrapper);
    await page.waitForTimeout(300);
    const after = await getComputedTransform(wrapper);
    expect(after).not.toBe(before);
  });

  test('the current count is displayed', async ({ page }) => {
    await expect(page.getByTestId('count-display')).toBeHidden();
    await page.getByTestId('start-button').click();
    await expect(page.getByTestId('count-display')).toBeVisible();
  });
});
