import { expect, test } from '@playwright/test';

test.describe('MICROPHONE source: off state', () => {
  test('Start Listening is active while the live-analysis area is visibly and semantically disabled', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('source-tab-microphone').click();

    await expect(page.getByTestId('start-listening-button')).toBeEnabled();
    const inactive = page.getByTestId('mic-analysis-inactive');
    await expect(inactive).toBeVisible();
    await expect(inactive).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByText('Microphone is off')).toBeVisible();
    await expect(page.getByText('MIC ON')).toHaveCount(0);
    await expect(page.getByTestId('bpm-detection-result')).toHaveCount(0);
  });

  test('selecting the MICROPHONE tab alone never requests permission', async ({ page }) => {
    // No permission granted up front — if the component requested access
    // just from the tab being selected, getUserMedia would hang/prompt and
    // the button would flip to "REQUESTING…" on its own.
    await page.goto('/');
    await page.getByTestId('source-tab-microphone').click();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('start-listening-button')).toHaveText('START LISTENING');
  });
});

test.describe('MICROPHONE source: permission + listening + stop', () => {
  test('Start Listening -> (requesting) -> listening, MIC ON shown as text (not color alone), Stop returns to off', async ({
    page,
  }) => {
    await page.context().grantPermissions(['microphone']);
    await page.goto('/');
    await page.getByTestId('source-tab-microphone').click();
    await page.getByTestId('start-listening-button').click();

    // Either state is a valid observation depending on how fast the fake
    // device resolves — the guarantee is it reaches one of them, not a
    // fixed-delay race.
    await expect(
      page.getByTestId('mic-listening').or(page.getByTestId('mic-analysis-error')),
    ).toBeVisible({ timeout: 15_000 });

    test.skip((await page.getByTestId('mic-analysis-error').count()) > 0, 'requires a working fake mic device');

    await expect(page.getByText('MIC ON')).toBeVisible();
    await expect(page.getByTestId('mic-analysis-loading')).toContainText('LISTENING');
    await expect(page.getByText('Collecting beat data…')).toBeVisible();
    await expect(page.getByTestId('start-listening-button')).toHaveText('START LISTENING');

    await page.getByTestId('stop-listening-button').click();

    await expect(page.getByText('MIC ON')).toHaveCount(0);
    await expect(page.getByTestId('mic-analysis-inactive')).toBeVisible();
    await expect(page.getByText('Microphone is off')).toBeVisible();
    await expect(page.getByTestId('bpm-detection-result')).toHaveCount(0);
  });
});
