import { expect, test } from '@playwright/test';

test.describe('CTA: START / PAUSE / RESTART', () => {
  test('Ready -> Start -> Pause -> Restart -> Pause, with matching labels and aria-labels', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByTestId('cta-button');

    await expect(cta).toHaveText(/START/);
    await expect(cta).toHaveAttribute('aria-label', 'Start metronome');
    await expect(page.getByTestId('status-badge')).toHaveText('READY');

    await cta.click();
    await expect(cta).toHaveText(/PAUSE/);
    await expect(cta).toHaveAttribute('aria-label', 'Pause metronome');
    await expect(page.getByTestId('status-badge')).toHaveText('PLAYING');

    await cta.click();
    await expect(cta).toHaveText(/RESTART/);
    await expect(cta).toHaveAttribute('aria-label', 'Restart from count 1');
    await expect(page.getByTestId('status-badge')).toHaveText('PAUSED');

    await cta.click();
    await expect(cta).toHaveText(/PAUSE/);
    await expect(page.getByTestId('status-badge')).toHaveText('PLAYING');
  });

  test('Restart brings the count display back to 1', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByTestId('cta-button');
    await page.locator('input[aria-label="BPM slider"]').fill('240'); // fast, so we reliably advance past beat 1
    await cta.click(); // Start
    await page.waitForTimeout(600); // several beats elapse
    await cta.click(); // Pause
    await cta.click(); // Restart

    await expect(page.getByTestId('current-beat')).toHaveText('1');
  });

  test('the CTA button never reads RESUME', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByTestId('cta-button');
    await cta.click();
    await cta.click();
    await cta.click();
    const text = await cta.textContent();
    expect(text?.toLowerCase()).not.toContain('resume');
  });

  test('pressing Space while the CTA button itself has focus toggles exactly once', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByTestId('cta-button');
    await cta.focus();

    await page.keyboard.press('Space');
    await expect(page.getByTestId('status-badge')).toHaveText('PLAYING');

    await page.keyboard.press('Space');
    await expect(page.getByTestId('status-badge')).toHaveText('PAUSED');
  });

  test('Pause keeps the current on-screen position (does not reset to start)', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[aria-label="BPM slider"]').fill('60');
    await page.getByTestId('cta-button').click(); // Start
    await page.waitForTimeout(400);
    await page.getByTestId('cta-button').click(); // Pause
    // Sample twice *after* pausing (not across the click itself, which has
    // its own real-world delay during which the ball is still moving) —
    // both samples must agree if the animation truly froze.
    const posBefore = await ballPos(page);
    await page.waitForTimeout(150);
    const posAfter = await ballPos(page);
    expect(Math.hypot(posBefore.x - posAfter.x, posBefore.y - posAfter.y)).toBeLessThan(2);
  });
});

async function ballPos(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('svg[data-viz="Bounce"]') as SVGSVGElement;
    const circle = svg.querySelector('circle') as SVGCircleElement;
    const p0 = svg.createSVGPoint();
    p0.x = 0;
    p0.y = 0;
    const screen = p0.matrixTransform(circle.getScreenCTM()!);
    return { x: screen.x, y: screen.y };
  });
}
