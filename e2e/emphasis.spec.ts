import { expect, test } from '@playwright/test';
import { readEmphasisLog, selectCountMode, selectViz, setBpmViaSlider, start, startEmphasisLog } from './helpers';

const VIZ_TYPES = ['Bounce', 'Swing', 'Pulse', 'Sweep'] as const;
const COUNT_MODES: { label: '4 / 4' | '8 Count'; totalBeats: number }[] = [
  { label: '4 / 4', totalBeats: 4 },
  { label: '8 Count', totalBeats: 8 },
];

const BPM = 240; // 250ms/beat — keeps the test suite fast without changing the policy under test.
const BEAT_MS = 60000 / BPM;
const CYCLES_TO_OBSERVE = 3;

for (const viz of VIZ_TYPES) {
  for (const { label, totalBeats } of COUNT_MODES) {
    test(`${viz} / ${label}: First Beat Emphasis ON emphasizes only beat 1, never 2..${totalBeats}`, async ({ page }) => {
      await page.goto('/');
      await selectViz(page, viz);
      await selectCountMode(page, label);
      await setBpmViaSlider(page, BPM);

      await startEmphasisLog(page);
      await start(page);

      const cycleMs = totalBeats * BEAT_MS;
      await page.waitForTimeout(cycleMs * CYCLES_TO_OBSERVE + 200);

      const log = await readEmphasisLog(page);
      const firstEntries = log.filter((e) => e.state === 'first');

      // One emphasis pulse per full cycle (beat 1 only) — never one per beat.
      expect(firstEntries.length).toBeGreaterThanOrEqual(CYCLES_TO_OBSERVE);
      expect(firstEntries.length).toBeLessThan(CYCLES_TO_OBSERVE * totalBeats);
      expect(firstEntries.length).toBeLessThanOrEqual(CYCLES_TO_OBSERVE + 1);

      // Consecutive first-beat pulses are one full cycle apart, not one beat apart.
      for (let i = 1; i < firstEntries.length; i++) {
        const gap = firstEntries[i]!.t - firstEntries[i - 1]!.t;
        expect(gap).toBeGreaterThan(cycleMs * 0.7);
      }
    });

    test(`${viz} / ${label}: First Beat Emphasis OFF never emphasizes any beat`, async ({ page }) => {
      await page.goto('/');
      await selectViz(page, viz);
      await selectCountMode(page, label);
      await setBpmViaSlider(page, BPM);
      await page.getByRole('switch', { name: 'First beat emphasis' }).click();

      await startEmphasisLog(page);
      await start(page);

      const cycleMs = totalBeats * BEAT_MS;
      await page.waitForTimeout(cycleMs * CYCLES_TO_OBSERVE + 200);

      const log = await readEmphasisLog(page);
      const firstEntries = log.filter((e) => e.state === 'first');
      expect(firstEntries).toHaveLength(0);

      const nonNoneEntries = log.filter((e) => e.state !== 'none');
      expect(nonNoneEntries).toHaveLength(0);
    });
  }
}
