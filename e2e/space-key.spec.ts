import { test, expect } from '@playwright/test';
import { getStatus } from './utils';

test.describe('Space key toggling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('one Space press on a non-interactive area toggles play exactly once', async ({ page }) => {
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    expect(await getStatus(page)).toBe('Ready');

    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    expect(await getStatus(page)).toBe('Playing');
  });

  test('a second Space press stops it again, exactly once', async ({ page }) => {
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    expect(await getStatus(page)).toBe('Playing');

    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    expect(await getStatus(page)).toBe('Paused');
  });

  test('Space does not double-toggle when the Start button itself has focus', async ({ page }) => {
    const startBtn = page.getByTestId('start-button');
    await startBtn.focus();
    expect(await getStatus(page)).toBe('Ready');

    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    // A double toggle would leave status back at Ready instead of Playing.
    expect(await getStatus(page)).toBe('Playing');
  });

  test('Space does not double-toggle when the play/pause corner button has focus', async ({ page }) => {
    await page.getByTestId('start-button').click();
    await page.waitForTimeout(100);
    expect(await getStatus(page)).toBe('Playing');

    const playPauseBtn = page.getByTestId('play-pause-button');
    await playPauseBtn.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    // A double toggle would leave status back at Playing instead of Paused.
    expect(await getStatus(page)).toBe('Paused');
  });

  test('Space does not double-toggle when the panel play/pause button has focus', async ({ page }) => {
    const panelBtn = page.getByRole('button', { name: /^(START|PAUSE|PLAY)/ });
    await panelBtn.focus();
    expect(await getStatus(page)).toBe('Ready');

    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    expect(await getStatus(page)).toBe('Playing');

    await panelBtn.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    expect(await getStatus(page)).toBe('Paused');
  });
});
