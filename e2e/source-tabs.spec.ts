import { expect, test } from '@playwright/test';

test.describe('SOURCE tabs', () => {
  test('a SOURCE section is shown directly below TAP TEMPO and above COUNT MODE', async ({ page }) => {
    await page.goto('/');
    const labels = await page.locator('div', { hasText: /^(SOURCE|COUNT MODE)$/ }).allTextContents();
    const sourceIndex = labels.indexOf('SOURCE');
    const countModeIndex = labels.indexOf('COUNT MODE');
    expect(sourceIndex).toBeGreaterThanOrEqual(0);
    expect(countModeIndex).toBeGreaterThan(sourceIndex);
    await expect(page.getByTestId('audio-source-section')).toBeVisible();
    await expect(page.getByText('TAP TEMPO')).toBeVisible();
  });

  test('FILE is selected by default, with proper tab semantics', async ({ page }) => {
    await page.goto('/');
    const fileTab = page.getByTestId('source-tab-file');
    const micTab = page.getByTestId('source-tab-microphone');

    await expect(page.getByRole('tablist', { name: 'Audio source' })).toBeVisible();
    await expect(fileTab).toHaveAttribute('aria-selected', 'true');
    await expect(micTab).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#source-panel-file')).toBeVisible();
  });

  test('clicking MICROPHONE switches tabs immediately when the file source is empty', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('source-tab-microphone').click();

    await expect(page.getByTestId('source-tab-microphone')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('source-tab-file')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#source-panel-microphone')).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });

  test('clicking FILE switches back immediately when the microphone is off', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('source-tab-microphone').click();
    await page.getByTestId('source-tab-file').click();

    await expect(page.getByTestId('source-tab-file')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#source-panel-file')).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });

  test('ArrowRight/ArrowLeft move focus and selection between tabs', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('source-tab-file').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('source-tab-microphone')).toBeFocused();
    await expect(page.getByTestId('source-tab-microphone')).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('source-tab-file')).toBeFocused();
    await expect(page.getByTestId('source-tab-file')).toHaveAttribute('aria-selected', 'true');
  });
});
