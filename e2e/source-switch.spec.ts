import { expect, test } from '@playwright/test';
import { generateClickTrackWav } from './wavFixture';

test.describe('FILE -> MICROPHONE switch confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles({
      name: 'click-track.wav',
      mimeType: 'audio/wav',
      buffer: generateClickTrackWav(120, 8),
    });
    await expect(page.getByTestId('selected-file-name')).toBeVisible();
  });

  test('clicking MICROPHONE with a selected file shows the confirmation dialog', async ({ page }) => {
    await page.getByTestId('source-tab-microphone').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.getByText('Switch to microphone?')).toBeVisible();
    await expect(
      page.getByText('The selected audio file and its analysis result will be removed.'),
    ).toBeVisible();
    await expect(page.getByTestId('source-switch-cancel')).toBeVisible();
    await expect(page.getByTestId('source-switch-confirm')).toHaveText('REMOVE & SWITCH');

    // Still on FILE underneath the dialog.
    await expect(page.getByTestId('source-tab-file')).toHaveAttribute('aria-selected', 'true');
  });

  test('Cancel keeps the file, result, and FILE tab exactly as they were', async ({ page }) => {
    await page.getByTestId('source-tab-microphone').click();
    await page.getByTestId('source-switch-cancel').click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('source-tab-file')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('selected-file-name')).toHaveText('click-track.wav');
  });

  test('Remove & Switch clears the file and switches to MICROPHONE without turning the mic on', async ({ page }) => {
    await page.getByTestId('source-tab-microphone').click();
    await page.getByTestId('source-switch-confirm').click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('source-tab-microphone')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('mic-analysis-inactive')).toBeVisible();
    await expect(page.getByText('Microphone is off')).toBeVisible();

    // Switching back to FILE proves the file was actually removed (no
    // confirmation needed this time, since FILE is now empty).
    await page.getByTestId('source-tab-file').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('file-analysis-inactive')).toBeVisible();
  });
});

test.describe('MICROPHONE -> FILE switch confirmation', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.setTimeout(30_000);
    await page.context().grantPermissions(['microphone']);
    await page.goto('/');
    await page.getByTestId('source-tab-microphone').click();
    await page.getByTestId('start-listening-button').click();
    await expect(
      page.getByTestId('mic-listening').or(page.getByTestId('mic-analysis-error')),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('clicking FILE while the microphone is on shows the confirmation dialog', async ({ page }) => {
    test.skip((await page.getByTestId('mic-analysis-error').count()) > 0, 'requires a working fake mic device');
    await page.getByTestId('source-tab-file').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Switch to file upload?')).toBeVisible();
    await expect(
      page.getByText('Microphone listening will stop and the detected result will be cleared.'),
    ).toBeVisible();
    await expect(page.getByTestId('source-switch-confirm')).toHaveText('STOP & SWITCH');
  });

  test('Cancel keeps listening', async ({ page }) => {
    test.skip((await page.getByTestId('mic-analysis-error').count()) > 0, 'requires a working fake mic device');
    await page.getByTestId('source-tab-file').click();
    await page.getByTestId('source-switch-cancel').click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('source-tab-microphone')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('MIC ON')).toBeVisible();
  });

  test('Stop & Switch stops listening and switches to FILE', async ({ page }) => {
    test.skip((await page.getByTestId('mic-analysis-error').count()) > 0, 'requires a working fake mic device');
    await page.getByTestId('source-tab-file').click();
    await page.getByTestId('source-switch-confirm').click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('source-tab-file')).toHaveAttribute('aria-selected', 'true');

    // Switching back to MICROPHONE proves it actually stopped (off, no
    // confirmation needed).
    await page.getByTestId('source-tab-microphone').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Microphone is off')).toBeVisible();
    await expect(page.getByText('MIC ON')).toHaveCount(0);
  });
});
