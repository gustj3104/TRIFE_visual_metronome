import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'e2e-screenshots');

test.describe('State screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Ready', async ({ page }) => {
    await page.screenshot({ path: path.join(OUT_DIR, 'ready.png') });
  });

  test('Playing', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, 'playing.png') });
  });

  test('Paused', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(200);
    await page.getByTestId('play-pause-button').click();
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(OUT_DIR, 'paused.png') });
  });

  test('Panel collapsed', async ({ page }) => {
    await page.getByTestId('panel-collapse-button').click();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(OUT_DIR, 'panel-collapsed.png') });
  });

  test('4/4 mode', async ({ page }) => {
    await page.getByTestId('count-mode-4-4').click();
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, 'count-mode-4-4.png') });
  });

  test('8 Count mode', async ({ page }) => {
    await page.getByTestId('count-mode-8count').click();
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, 'count-mode-8count.png') });
  });

  test('First beat emphasis On', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, 'first-beat-emphasis-on.png') });
  });

  test('First beat emphasis Off', async ({ page }) => {
    await page.getByTestId('first-beat-emphasis-toggle').click();
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, 'first-beat-emphasis-off.png') });
  });
});
