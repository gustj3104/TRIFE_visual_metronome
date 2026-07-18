import { test, expect } from '@playwright/test';

test.describe('Count mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('4/4 shows 4 counts', async ({ page }) => {
    await page.getByTestId('count-mode-4-4').click();
    await page.getByTestId('start-button').click();
    await expect(page.getByTestId('count-display').locator('span')).toHaveCount(4);
  });

  test('8 Count shows 8 counts', async ({ page }) => {
    await page.getByTestId('count-mode-8count').click();
    await page.getByTestId('start-button').click();
    await expect(page.getByTestId('count-display').locator('span')).toHaveCount(8);
  });

  test('the selected mode is visually distinguished', async ({ page }) => {
    const fourFour = page.getByTestId('count-mode-4-4');
    const eightCount = page.getByTestId('count-mode-8count');

    await expect(fourFour).toHaveAttribute('aria-pressed', 'true');
    await expect(eightCount).toHaveAttribute('aria-pressed', 'false');

    await eightCount.click();

    await expect(fourFour).toHaveAttribute('aria-pressed', 'false');
    await expect(eightCount).toHaveAttribute('aria-pressed', 'true');
  });
});
