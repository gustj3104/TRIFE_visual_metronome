import { expect, type Page } from '@playwright/test';
import { test } from '@playwright/test';
import { readSwingConnectionPoints, selectViz, setBpmViaSlider, start } from './helpers';

const TOLERANCE_PX = 1;

async function assertConnectedOverTime(page: Page, sampleWindowMs: number, stepMs = 40) {
  const samples = Math.ceil(sampleWindowMs / stepMs);
  for (let i = 0; i < samples; i++) {
    const { lineEnd, bobCenter } = await readSwingConnectionPoints(page);
    const dx = Math.abs(lineEnd.x - bobCenter.x);
    const dy = Math.abs(lineEnd.y - bobCenter.y);
    expect(dx, `x offset at sample ${i}`).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(dy, `y offset at sample ${i}`).toBeLessThanOrEqual(TOLERANCE_PX);
    await page.waitForTimeout(stepMs);
  }
}

async function setShapeScale(page: Page, value: number) {
  await page.getByTestId('shape-scale-slider').fill(String(value));
}

async function setVisualScale(page: Page, value: number) {
  await page.getByTestId('visual-scale-slider').fill(String(value));
}

test.describe('Swing: line and bob never separate', () => {
  for (const bpm of [40, 120, 240]) {
    test(`stays connected across a full swing at ${bpm} BPM`, async ({ page }) => {
      await page.goto('/');
      await selectViz(page, 'Swing');
      await setBpmViaSlider(page, bpm);
      await start(page);
      const beatMs = 60000 / bpm;
      await assertConnectedOverTime(page, beatMs * 1.5, Math.max(20, beatMs / 15));
    });
  }

  for (const enabled of [true, false]) {
    test(`stays connected with First Beat Emphasis ${enabled ? 'ON' : 'OFF'}`, async ({ page }) => {
      await page.goto('/');
      await selectViz(page, 'Swing');
      await setBpmViaSlider(page, 240);
      if (!enabled) await page.getByRole('switch', { name: 'First beat emphasis' }).click();
      await start(page);
      await assertConnectedOverTime(page, 400, 30);
    });
  }

  for (const shapeScale of [0.6, 1, 1.6]) {
    test(`stays connected at Shape Size ${Math.round(shapeScale * 100)}%`, async ({ page }) => {
      await page.goto('/');
      await selectViz(page, 'Swing');
      await setBpmViaSlider(page, 240);
      await setShapeScale(page, shapeScale);
      await start(page);
      await assertConnectedOverTime(page, 400, 30);
    });
  }

  for (const visualScale of [0.7, 1, 1.3]) {
    test(`stays connected at Visual Scale ${Math.round(visualScale * 100)}%`, async ({ page }) => {
      await page.goto('/');
      await selectViz(page, 'Swing');
      await setBpmViaSlider(page, 240);
      await setVisualScale(page, visualScale);
      await start(page);
      await assertConnectedOverTime(page, 400, 30);
    });
  }

  test('stays connected while resizing shape/visual scale mid-play', async ({ page }) => {
    await page.goto('/');
    await selectViz(page, 'Swing');
    await setBpmViaSlider(page, 240);
    await start(page);
    await page.waitForTimeout(80);
    await setShapeScale(page, 1.6);
    await setVisualScale(page, 1.3);
    await assertConnectedOverTime(page, 400, 30);
    await setShapeScale(page, 0.6);
    await setVisualScale(page, 0.7);
    await assertConnectedOverTime(page, 400, 30);
  });

  test('stays connected through panel collapse/expand', async ({ page }) => {
    await page.goto('/');
    await selectViz(page, 'Swing');
    await setBpmViaSlider(page, 240);
    await start(page);
    await page.waitForTimeout(80);
    await page.getByTitle('Collapse (C)').click();
    await page.waitForTimeout(200);
    const connected1 = await readSwingConnectionPoints(page);
    expect(Math.abs(connected1.lineEnd.x - connected1.bobCenter.x)).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(Math.abs(connected1.lineEnd.y - connected1.bobCenter.y)).toBeLessThanOrEqual(TOLERANCE_PX);
    await page.getByTitle('Open panel (C)').click();
    await assertConnectedOverTime(page, 400, 30);
  });

  test('stays connected after switching away to another visualization and back', async ({ page }) => {
    await page.goto('/');
    await selectViz(page, 'Swing');
    await setBpmViaSlider(page, 240);
    await start(page);
    await page.waitForTimeout(80);
    await selectViz(page, 'Bounce');
    await page.waitForTimeout(150);
    await selectViz(page, 'Swing');
    await assertConnectedOverTime(page, 400, 30);
  });

  test('stays connected while Ready (idle, not yet playing)', async ({ page }) => {
    await page.goto('/');
    await selectViz(page, 'Swing');
    const { lineEnd, bobCenter } = await readSwingConnectionPoints(page);
    expect(Math.abs(lineEnd.x - bobCenter.x)).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(Math.abs(lineEnd.y - bobCenter.y)).toBeLessThanOrEqual(TOLERANCE_PX);
  });
});
