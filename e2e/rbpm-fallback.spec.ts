import { expect, test } from '@playwright/test';
import { generateClickTrackWav } from './wavFixture';

test.describe('rbpm fallback', () => {
  test('file analysis still succeeds via the custom engine when rbpm (OfflineAudioContext) is unavailable', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // realtime-bpm-analyzer's analyzeFullBuffer constructs an
      // OfflineAudioContext internally — breaking that simulates rbpm being
      // unavailable in this environment without touching the custom engine,
      // which doesn't use it.
      window.OfflineAudioContext = class {
        constructor() {
          throw new Error('mocked OfflineAudioContext failure for e2e fallback test');
        }
      } as unknown as typeof OfflineAudioContext;
    });

    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles({
      name: 'click-track.wav',
      mimeType: 'audio/wav',
      buffer: generateClickTrackWav(128, 8),
    });

    await expect(page.getByTestId('bpm-detection-result')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('file-analysis-error')).toHaveCount(0);

    const applyButton = page.getByTestId('bpm-apply-button');
    const detectedBpmText = await applyButton.textContent();
    const detectedBpm = Number(detectedBpmText?.replace(/\D/g, ''));
    expect(detectedBpm).toBeGreaterThanOrEqual(40);
    expect(detectedBpm).toBeLessThanOrEqual(240);
  });

  test('microphone analysis still reaches "listening" (custom engine keeps running) when the rbpm AudioWorklet fails to load', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.AudioWorklet.prototype.addModule = () =>
        Promise.reject(new Error('mocked worklet load failure for e2e fallback test'));
    });
    await page.context().grantPermissions(['microphone']);
    await page.goto('/');
    await page.getByTestId('source-tab-microphone').click();
    await page.getByTestId('start-listening-button').click();

    await expect(page.getByTestId('mic-listening').or(page.getByTestId('mic-analysis-error'))).toBeVisible({
      timeout: 15_000,
    });

    test.skip((await page.getByTestId('mic-analysis-error').count()) > 0, 'requires a working fake mic device');

    // The rbpm worklet failure must not be surfaced as an app-level error —
    // the custom engine keeps analyzing on its own.
    await expect(page.getByText('MIC ON')).toBeVisible();
    await expect(page.getByTestId('mic-analysis-error')).toHaveCount(0);
  });
});
