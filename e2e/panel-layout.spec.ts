import { test, expect } from '@playwright/test';

test.describe('Panel layout at 1920x1080', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('with panel open, the visual center is centered in the remaining area', async ({ page }) => {
    const viewport = page.viewportSize()!;
    const box = (await page.getByTestId('metronome-visual-root').boundingBox())!;
    const panelBox = (await page.getByTestId('control-panel').boundingBox())!;

    const expectedWidth = viewport.width - panelBox.width;
    expect(Math.abs(box.width - expectedWidth)).toBeLessThanOrEqual(1);

    const centerX = box.x + box.width / 2;
    expect(Math.abs(centerX - box.width / 2)).toBeLessThanOrEqual(1);
  });

  test('with panel collapsed, the visual center moves to the full-screen center', async ({ page }) => {
    await page.getByTestId('panel-collapse-button').click();
    await page.waitForTimeout(350);

    const viewport = page.viewportSize()!;
    const box = (await page.getByTestId('metronome-visual-root').boundingBox())!;
    const centerX = box.x + box.width / 2;

    // The collapsed panel still occupies its 1px border, so allow that slack.
    expect(Math.abs(centerX - viewport.width / 2)).toBeLessThanOrEqual(1);
  });

  test('no page overflow or clipping occurs', async ({ page }) => {
    const dims = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    expect(dims.scrollWidth).toBe(dims.clientWidth);
    expect(dims.scrollHeight).toBe(dims.clientHeight);

    await page.getByTestId('panel-collapse-button').click();
    await page.waitForTimeout(350);
    const dimsAfter = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    expect(dimsAfter.scrollWidth).toBe(dimsAfter.clientWidth);
    expect(dimsAfter.scrollHeight).toBe(dimsAfter.clientHeight);
  });
});
