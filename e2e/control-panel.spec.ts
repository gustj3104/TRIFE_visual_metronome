import { test, expect } from '@playwright/test';
import { getStatus, getBpm } from './utils';

test.describe('Control panel collapse / expand', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('the collapse button hides the right panel', async ({ page }) => {
    const panel = page.getByTestId('control-panel');
    await expect(panel).toHaveCSS('width', /268/);

    await page.getByTestId('panel-collapse-button').click();
    await expect(async () => {
      const box = (await panel.boundingBox())!;
      // Collapses to just its 1px border; effectively closed.
      expect(box.width).toBeLessThanOrEqual(2);
    }).toPass();
  });

  test('the expand handle appears once collapsed', async ({ page }) => {
    await page.getByTestId('panel-collapse-button').click();
    await expect(page.getByTestId('panel-expand-handle')).toBeVisible();
  });

  test('clicking the expand handle reopens the panel', async ({ page }) => {
    await page.getByTestId('panel-collapse-button').click();
    await page.getByTestId('panel-expand-handle').click();

    const panel = page.getByTestId('control-panel');
    await expect(panel).toHaveCSS('width', /268/);
    await expect(page.getByTestId('bpm-display')).toBeVisible();
  });

  test('play state and BPM survive a collapse/expand cycle while playing', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowRight'); // 121 BPM, focus is on the button but ArrowRight isn't intercepted by it
    await page.waitForTimeout(50);

    expect(await getStatus(page)).toBe('Playing');
    const bpmBefore = await getBpm(page);

    await page.getByTestId('panel-collapse-button').click();
    await page.waitForTimeout(300);
    expect(await getStatus(page)).toBe('Playing');

    await page.getByTestId('panel-expand-handle').click();
    await page.waitForTimeout(300);

    expect(await getStatus(page)).toBe('Playing');
    expect(await getBpm(page)).toBe(bpmBefore);
  });
});
