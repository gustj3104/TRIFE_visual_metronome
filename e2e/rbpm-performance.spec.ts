import { expect, test } from '@playwright/test';
import { generateClickTrackWav } from './wavFixture';

test.describe('rbpm performance', () => {
  test('WAAPI animation and the control panel stay responsive during a multi-segment ensemble file analysis', async ({
    page,
  }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const w = window as unknown as { __longTasks: number[] };
      w.__longTasks = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) w.__longTasks.push(entry.duration);
      }).observe({ type: 'longtask', buffered: true });
    });

    // Start the metronome BEFORE analysis begins so we can confirm the WAAPI
    // animation keeps running throughout — the whole point of running both
    // engines sequentially-with-yields on the main thread (see the project
    // plan's Performance section) rather than blocking it outright.
    await page.getByTestId('cta-button').click();
    await expect(page.getByTestId('status-badge')).toHaveText('PLAYING');

    await page.getByTestId('file-input').setInputFiles({
      name: 'long-track.wav',
      mimeType: 'audio/wav',
      // >60s triggers the 3-segment (start/middle/end) analysis path for
      // BOTH engines — the heaviest case this app performs.
      buffer: generateClickTrackWav(128, 70),
    });

    await expect(
      page.getByTestId('file-analysis-loading').or(page.getByTestId('bpm-detection-result')),
    ).toBeVisible();
    // Checked DURING analysis, not just after it completes.
    await expect(page.getByTestId('status-badge')).toHaveText('PLAYING');

    // The control panel must remain interactive during analysis — a click
    // registers rather than queuing behind a long task.
    await page.getByTestId('cta-button').click();
    await expect(page.getByTestId('status-badge')).toHaveText('PAUSED');
    await page.getByTestId('cta-button').click();
    await expect(page.getByTestId('status-badge')).toHaveText('PLAYING');

    await expect(page.getByTestId('bpm-detection-result')).toBeVisible({ timeout: 30_000 });

    const longTasks = await page.evaluate(() => (window as unknown as { __longTasks: number[] }).__longTasks);
    const longestTaskMs = longTasks.length > 0 ? Math.max(...longTasks) : 0;
    console.log(`[rbpm performance] long tasks: ${longTasks.length}, longest: ${longestTaskMs.toFixed(1)}ms`);
    // Not a tight perf budget (CI timing varies) — this only catches a
    // genuine main-thread deadlock/freeze during ensemble analysis. Exact
    // long-task counts/durations are reported in the final write-up instead
    // of hard-coded here.
    expect(longestTaskMs).toBeLessThan(5000);
  });
});
