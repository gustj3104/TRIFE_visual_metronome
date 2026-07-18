import { test, expect } from '@playwright/test';

test.describe('Initial screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Android Music Player with Spinning Gramophone/);
  });

  test('starts in Ready state', async ({ page }) => {
    await expect(page.getByTestId('start-button')).toBeVisible();
    await expect(page.getByText('READY')).toBeVisible();
  });

  test('shows the Start button', async ({ page }) => {
    await expect(page.getByTestId('start-button')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start metronome' })).toBeVisible();
  });

  test('defaults to 120 BPM', async ({ page }) => {
    await expect(page.getByTestId('bpm-display')).toHaveText('120');
  });

  test('defaults to 4/4 count mode', async ({ page }) => {
    await expect(page.getByTestId('count-mode-4-4')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('count-mode-8count')).toHaveAttribute('aria-pressed', 'false');
  });

  test('shows the control panel', async ({ page }) => {
    await expect(page.getByTestId('control-panel')).toBeVisible();
    await expect(page.getByText('BEAT', { exact: true })).toBeVisible();
  });
});
