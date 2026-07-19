import { expect, test } from '@playwright/test';

async function circleBBox(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('svg[data-viz="Bounce"]') as SVGSVGElement;
    const circle = svg.querySelector('circle') as SVGCircleElement;
    const rect = circle.getBoundingClientRect();
    return { width: rect.width, height: rect.height, x: rect.x, y: rect.y };
  });
}

async function trackLineBBox(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('svg[data-viz="Bounce"]') as SVGSVGElement;
    const line = svg.querySelector('line') as SVGLineElement;
    return line.getBoundingClientRect().height + line.getBoundingClientRect().width;
  });
}

test.describe('Visual/Shape Size controls', () => {
  test('a SIZE section exists directly after COLOR in the panel', async ({ page }) => {
    await page.goto('/');
    const labels = await page.locator('div', { hasText: /^(COLOR|SIZE)$/ }).allTextContents();
    const colorIndex = labels.indexOf('COLOR');
    const sizeIndex = labels.indexOf('SIZE');
    expect(colorIndex).toBeGreaterThanOrEqual(0);
    expect(sizeIndex).toBeGreaterThan(colorIndex);
    await expect(page.getByTestId('size-section')).toBeVisible();
  });

  test('defaults are both 100%', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('visual-scale-slider')).toHaveValue('1');
    await expect(page.getByTestId('shape-scale-slider')).toHaveValue('1');
  });

  test('Visual Scale changes the whole visualization, Shape Size changes only the core shape', async ({ page }) => {
    await page.goto('/');
    const baseCircle = await circleBBox(page);
    const baseTrack = await trackLineBBox(page);

    await page.getByTestId('shape-scale-slider').fill('1.6');
    const shapeGrownCircle = await circleBBox(page);
    const shapeGrownTrack = await trackLineBBox(page);
    expect(shapeGrownCircle.width).toBeGreaterThan(baseCircle.width * 1.3);
    // Track geometry must not move because of a shape-size change.
    expect(Math.abs(shapeGrownTrack - baseTrack)).toBeLessThan(2);

    await page.getByTestId('shape-scale-slider').fill('1');
    await page.getByTestId('visual-scale-slider').fill('1.3');
    const visualGrownCircle = await circleBBox(page);
    const visualGrownTrack = await trackLineBBox(page);
    expect(visualGrownCircle.width).toBeGreaterThan(baseCircle.width * 1.15);
    // Visual scale affects the whole scene, including the track.
    expect(visualGrownTrack).toBeGreaterThan(baseTrack * 1.15);
  });

  test('resizing does not change BPM, count mode, or play status', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('cta-button').click();
    await page.locator('input[aria-label="BPM slider"]').fill('150');

    await page.getByTestId('visual-scale-slider').fill('1.3');
    await page.getByTestId('shape-scale-slider').fill('0.6');

    await expect(page.getByTestId('status-badge')).toHaveText('PLAYING');
    await expect(page.getByRole('button', { name: 'Edit BPM' })).toHaveText('150');
  });

  test('Shape Size does not move the swing bob center off the shared connection point', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Swing', exact: true }).click();
    const centerAt100 = await bobCenter(page);
    await page.getByTestId('shape-scale-slider').fill('1.6');
    const centerAt160 = await bobCenter(page);
    expect(Math.abs(centerAt100.x - centerAt160.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(centerAt100.y - centerAt160.y)).toBeLessThanOrEqual(1);
  });

  test('the panel scrolls internally and the CTA stays reachable at a short viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 500 });
    await page.goto('/');
    const cta = page.getByTestId('cta-button');
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page.getByTestId('status-badge')).toHaveText('PLAYING');
  });

  test('no console errors at maximum Visual Scale (130%) and Shape Size (160%)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByTestId('visual-scale-slider').fill('1.3');
    await page.getByTestId('shape-scale-slider').fill('1.6');
    await page.getByTestId('cta-button').click();
    await page.waitForTimeout(200);
    expect(errors).toEqual([]);
  });
});

async function bobCenter(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('svg[data-viz="Swing"]') as SVGSVGElement;
    const bob = svg.querySelector('[data-testid="swing-bob"]') as SVGCircleElement;
    const p0 = svg.createSVGPoint();
    p0.x = 0;
    p0.y = 0;
    const screen = p0.matrixTransform(bob.getScreenCTM()!);
    return { x: screen.x, y: screen.y };
  });
}
