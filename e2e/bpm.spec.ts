import { test, expect } from '@playwright/test';
import { getBpm } from './utils';

test.describe('BPM keyboard adjustment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Move focus to a neutral, non-interactive area so the global
    // keyboard shortcut handler (not a native <input>) processes the keys.
    await page.locator('body').click({ position: { x: 10, y: 10 } });
  });

  test('ArrowRight increases BPM by 1', async ({ page }) => {
    expect(await getBpm(page)).toBe(120);
    await page.keyboard.press('ArrowRight');
    expect(await getBpm(page)).toBe(121);
  });

  test('ArrowLeft decreases BPM by 1', async ({ page }) => {
    expect(await getBpm(page)).toBe(120);
    await page.keyboard.press('ArrowLeft');
    expect(await getBpm(page)).toBe(119);
  });

  test('Shift+ArrowRight increases BPM by 5', async ({ page }) => {
    expect(await getBpm(page)).toBe(120);
    await page.keyboard.press('Shift+ArrowRight');
    expect(await getBpm(page)).toBe(125);
  });

  test('Shift+ArrowLeft decreases BPM by 5', async ({ page }) => {
    expect(await getBpm(page)).toBe(120);
    await page.keyboard.press('Shift+ArrowLeft');
    expect(await getBpm(page)).toBe(115);
  });

  test('BPM never drops below 40', async ({ page }) => {
    // 120 -> 40 is exactly 16 steps of -5.
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press('Shift+ArrowLeft');
    }
    expect(await getBpm(page)).toBe(40);

    await page.keyboard.press('Shift+ArrowLeft');
    expect(await getBpm(page)).toBe(40);
    await page.keyboard.press('ArrowLeft');
    expect(await getBpm(page)).toBe(40);
  });

  test('BPM never exceeds 240', async ({ page }) => {
    // 120 -> 240 is exactly 24 steps of +5.
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press('Shift+ArrowRight');
    }
    expect(await getBpm(page)).toBe(240);

    await page.keyboard.press('Shift+ArrowRight');
    expect(await getBpm(page)).toBe(240);
    await page.keyboard.press('ArrowRight');
    expect(await getBpm(page)).toBe(240);
  });
});
