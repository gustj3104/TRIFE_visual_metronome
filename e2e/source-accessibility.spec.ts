import { expect, test } from '@playwright/test';
import { generateClickTrackWav } from './wavFixture';

async function openSwitchDialogFromFile(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByTestId('file-input').setInputFiles({
    name: 'click-track.wav',
    mimeType: 'audio/wav',
    buffer: generateClickTrackWav(120, 8),
  });
  await expect(page.getByTestId('selected-file-name')).toBeVisible();
  await page.getByTestId('source-tab-microphone').click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.describe('Switch-confirmation dialog: accessibility', () => {
  test('focus moves into the dialog on Cancel on open, and returns to the triggering tab on close', async ({ page }) => {
    await openSwitchDialogFromFile(page);
    await expect(page.getByTestId('source-switch-cancel')).toBeFocused();

    await page.getByTestId('source-switch-cancel').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('source-tab-microphone')).toBeFocused();
  });

  test('Escape closes the dialog (as Cancel) and returns focus', async ({ page }) => {
    await openSwitchDialogFromFile(page);
    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('source-tab-file')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('selected-file-name')).toBeVisible(); // Escape behaves like Cancel, not confirm
    await expect(page.getByTestId('source-tab-microphone')).toBeFocused();
  });

  test('clicking the backdrop behaves like Cancel, not like the destructive confirm', async ({ page }) => {
    await openSwitchDialogFromFile(page);
    // Click far outside the dialog card, inside the fixed backdrop overlay.
    await page.mouse.click(5, 5);

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('source-tab-file')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('selected-file-name')).toBeVisible();
  });

  test('Space does not toggle metronome playback while the dialog is open', async ({ page }) => {
    await openSwitchDialogFromFile(page);
    await expect(page.getByTestId('status-badge')).toHaveText('READY');

    await page.keyboard.press('Space');
    await expect(page.getByTestId('status-badge')).toHaveText('READY');

    await page.keyboard.press('Escape');
  });

  test('arrow-key BPM shortcuts do not fire while the dialog is open', async ({ page }) => {
    await openSwitchDialogFromFile(page);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');

    await expect(page.getByRole('button', { name: 'Edit BPM' })).toHaveText('120');
  });

  test('Tab cycles focus between Cancel and the destructive confirm button only', async ({ page }) => {
    await openSwitchDialogFromFile(page);
    await expect(page.getByTestId('source-switch-cancel')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('source-switch-confirm')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('source-switch-cancel')).toBeFocused();

    await page.keyboard.press('Escape');
  });
});

test.describe('Loading indicators: aria and reduced motion', () => {
  // The mic "listening" state persists until Stop is clicked (unlike the
  // file-analysis loading phase, which a short fixture races through in a
  // few milliseconds) — a stable target for asserting on the shared
  // LoadingIndicator's aria attributes and reduced-motion behavior.
  test('microphone listening state exposes role=status and aria-live=polite', async ({ page }) => {
    await page.context().grantPermissions(['microphone']);
    await page.goto('/');
    await page.getByTestId('source-tab-microphone').click();
    await page.getByTestId('start-listening-button').click();

    const loading = page.getByTestId('mic-analysis-loading');
    await expect(loading.or(page.getByTestId('mic-analysis-error'))).toBeVisible({ timeout: 15_000 });
    test.skip((await page.getByTestId('mic-analysis-error').count()) > 0, 'requires a working fake mic device');

    await expect(loading).toHaveAttribute('role', 'status');
    await expect(loading).toHaveAttribute('aria-live', 'polite');
  });

  test('spinner has aria-hidden and is static under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.context().grantPermissions(['microphone']);
    await page.goto('/');
    await page.getByTestId('source-tab-microphone').click();
    await page.getByTestId('start-listening-button').click();

    const loading = page.getByTestId('mic-analysis-loading');
    await expect(loading.or(page.getByTestId('mic-analysis-error'))).toBeVisible({ timeout: 15_000 });
    test.skip((await page.getByTestId('mic-analysis-error').count()) > 0, 'requires a working fake mic device');

    const spinner = loading.locator('[aria-hidden="true"]');
    await expect(spinner).toHaveCSS('animation-name', 'none');
  });
});
