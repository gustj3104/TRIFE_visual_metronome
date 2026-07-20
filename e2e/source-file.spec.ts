import { expect, test } from '@playwright/test';
import { generateClickTrackWav, generateSilentWav } from './wavFixture';

test.describe('FILE source: empty state', () => {
  test('Upload is active while the analysis area is visibly and semantically disabled', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('upload-audio-button')).toBeEnabled();

    const inactive = page.getByTestId('file-analysis-inactive');
    await expect(inactive).toBeVisible();
    await expect(inactive).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByText('No audio file selected')).toBeVisible();
    await expect(page.getByText('Upload an audio file to enable analysis.')).toBeVisible();
    await expect(page.getByTestId('bpm-detection-result')).toHaveCount(0);
  });
});

test.describe('FILE source: analysis flow', () => {
  test('decoding -> analyzing -> success, then Apply/Half/Double, without disturbing playback phase', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles({
      name: 'click-track.wav',
      mimeType: 'audio/wav',
      buffer: generateClickTrackWav(128, 8),
    });

    await expect(page.getByTestId('selected-file-name')).toHaveText('click-track.wav');

    // A loading state must appear (decoding and/or analyzing) — state-based
    // wait, not a fixed timeout, since real analysis time isn't fixed.
    await expect(page.getByTestId('file-analysis-loading').or(page.getByTestId('bpm-detection-result'))).toBeVisible();

    await expect(page.getByTestId('bpm-detection-result')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('file-analysis-loading')).toHaveCount(0);

    const applyButton = page.getByTestId('bpm-apply-button');
    const detectedBpmText = await applyButton.textContent();
    const detectedBpm = Number(detectedBpmText?.replace(/\D/g, ''));
    expect(detectedBpm).toBeGreaterThanOrEqual(40);
    expect(detectedBpm).toBeLessThanOrEqual(240);

    // Start playback at the original BPM, let it run briefly, then Apply —
    // the WAAPI phase must be preserved (same guarantee as the existing
    // inline-BPM-edit path), not reset to the start of the animation.
    await page.getByTestId('cta-button').click();
    await page.waitForTimeout(120);
    await applyButton.click();

    await expect(page.getByTestId('status-badge')).toHaveText('PLAYING');
    await expect(page.getByRole('button', { name: 'Edit BPM' })).toHaveText(String(detectedBpm));

    // The file and its analysis result remain after Apply.
    await expect(page.getByTestId('selected-file-name')).toBeVisible();
    await expect(page.getByTestId('bpm-detection-result')).toBeVisible();
  });

  test('Half and Double apply half/double BPM, disabled when out of range', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles({
      name: 'click-track.wav',
      mimeType: 'audio/wav',
      buffer: generateClickTrackWav(100, 8),
    });
    await expect(page.getByTestId('bpm-detection-result')).toBeVisible({ timeout: 15_000 });

    const halfButton = page.getByTestId('bpm-half-button');
    const doubleButton = page.getByTestId('bpm-double-button');
    await expect(halfButton).toBeEnabled();
    await expect(doubleButton).toBeEnabled();

    const halfText = await halfButton.textContent();
    const half = Number(halfText?.replace(/\D/g, ''));
    await halfButton.click();
    await expect(page.getByRole('button', { name: 'Edit BPM' })).toHaveText(String(half));
  });

  test('an unsupported file type shows an error with a retry action', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles({
      name: 'clip.mov',
      mimeType: 'video/quicktime',
      buffer: Buffer.from([0, 1, 2, 3]),
    });

    await expect(page.getByTestId('file-analysis-error')).toBeVisible();
    await expect(page.getByRole('button', { name: 'CHOOSE ANOTHER FILE' })).toBeVisible();
  });

  test('silent audio surfaces a no-stable-bpm error', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles({
      name: 'silence.wav',
      mimeType: 'audio/wav',
      buffer: generateSilentWav(5),
    });

    await expect(page.getByTestId('file-analysis-error')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('No stable beat')).toBeVisible();
  });

  test('Remove File clears the file, result, and returns the analysis area to its inactive state', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles({
      name: 'click-track.wav',
      mimeType: 'audio/wav',
      buffer: generateClickTrackWav(120, 8),
    });
    await expect(page.getByTestId('bpm-detection-result')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('remove-file-button').click();

    await expect(page.getByTestId('selected-file-name')).toHaveCount(0);
    await expect(page.getByTestId('file-analysis-inactive')).toBeVisible();
    await expect(page.getByTestId('bpm-detection-result')).toHaveCount(0);
  });
});
