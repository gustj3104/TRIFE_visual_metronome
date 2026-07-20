import { expect, test } from '@playwright/test';
import {
  generateClickTrackWav,
  generateHalfTimeAmbiguousWav,
  generateMixedEmphasisWav,
  generateStereoImbalancedWav,
  generateSyncopatedWav,
  generateWeakBeatWav,
  generateWithLeadingSilenceWav,
} from './wavFixture';

/**
 * Dev/benchmark comparison of the custom engine, rbpm, and the ensemble
 * result across a range of synthetic patterns — not just clean click tracks
 * at a handful of BPMs, but the harder cases called out in the project plan:
 * weak beats, mixed-emphasis (backbeat) dynamics, syncopation, a
 * half-time-ambiguous accent pattern, a leading-silence intro, and a
 * stereo channel imbalance. This does NOT stand in for real-music accuracy
 * validation (no synthetic pattern captures genre/timbre variety a real
 * recording has) — it's the broader synthetic coverage from the project
 * plan's test-dataset section, run against the real engines in a real
 * browser rather than mocked.
 *
 * Reads window.__tempoEnsembleDebug (see src/app/lib/tempoEngineMode.ts)
 * after each analysis rather than the DOM, since production intentionally
 * hides the per-engine breakdown from the default UI.
 */

interface BenchmarkCase {
  name: string;
  expectedBpm: number;
  buffer: Buffer;
}

interface DebugInfo {
  customBpm: number | null;
  rbpmBpm: number | null;
  finalBpm: number;
  agreement: string;
  confidenceLevel: string;
}

function exactMatch(detected: number | null, expected: number): boolean {
  return detected !== null && Math.abs(detected - expected) <= 2;
}

function tempoFamilyMatch(detected: number | null, expected: number): boolean {
  if (detected === null) return false;
  return [expected, expected / 2, expected * 2].some((ref) => Math.abs(detected - ref) <= 2);
}

const DURATION_SEC = 20;

const cases: BenchmarkCase[] = [
  { name: 'click 60bpm', expectedBpm: 60, buffer: generateClickTrackWav(60, DURATION_SEC) },
  { name: 'click 90bpm', expectedBpm: 90, buffer: generateClickTrackWav(90, DURATION_SEC) },
  { name: 'click 120bpm', expectedBpm: 120, buffer: generateClickTrackWav(120, DURATION_SEC) },
  { name: 'click 128bpm', expectedBpm: 128, buffer: generateClickTrackWav(128, DURATION_SEC) },
  { name: 'click 150bpm', expectedBpm: 150, buffer: generateClickTrackWav(150, DURATION_SEC) },
  { name: 'click 180bpm', expectedBpm: 180, buffer: generateClickTrackWav(180, DURATION_SEC) },
  { name: 'weak beat 120bpm', expectedBpm: 120, buffer: generateWeakBeatWav(120, DURATION_SEC) },
  { name: 'mixed emphasis (backbeat) 128bpm', expectedBpm: 128, buffer: generateMixedEmphasisWav(128, DURATION_SEC) },
  { name: 'syncopated 120bpm', expectedBpm: 120, buffer: generateSyncopatedWav(120, DURATION_SEC) },
  {
    name: 'half-time-ambiguous accents 128bpm',
    expectedBpm: 128,
    buffer: generateHalfTimeAmbiguousWav(128, DURATION_SEC),
  },
  {
    name: 'leading silence (5s) + 120bpm',
    expectedBpm: 120,
    buffer: generateWithLeadingSilenceWav(120, DURATION_SEC, 5),
  },
  { name: 'stereo channel imbalance 120bpm', expectedBpm: 120, buffer: generateStereoImbalancedWav(120, DURATION_SEC) },
];

test('benchmark: custom vs rbpm vs ensemble across synthetic patterns', async ({ page }) => {
  test.slow();
  await page.goto('/');

  const rows: Array<{
    name: string;
    expectedBpm: number;
    customBpm: number | null;
    rbpmBpm: number | null;
    finalBpm: number | null;
    agreement: string;
    confidenceLevel: string;
    customExact: boolean;
    rbpmExact: boolean;
    ensembleExact: boolean;
    customFamily: boolean;
    rbpmFamily: boolean;
    ensembleFamily: boolean;
  }> = [];

  for (const c of cases) {
    await page.evaluate(() => {
      delete (window as unknown as { __tempoEnsembleDebug?: unknown }).__tempoEnsembleDebug;
    });

    await page.getByTestId('file-input').setInputFiles({ name: `${c.name}.wav`, mimeType: 'audio/wav', buffer: c.buffer });

    await expect(
      page.getByTestId('bpm-detection-result').or(page.getByTestId('file-analysis-error')),
    ).toBeVisible({ timeout: 20_000 });

    const failed = (await page.getByTestId('file-analysis-error').count()) > 0;
    const debug = failed
      ? null
      : ((await page.evaluate(
          () => (window as unknown as { __tempoEnsembleDebug?: DebugInfo }).__tempoEnsembleDebug,
        )) ?? null);

    rows.push({
      name: c.name,
      expectedBpm: c.expectedBpm,
      customBpm: debug?.customBpm ?? null,
      rbpmBpm: debug?.rbpmBpm ?? null,
      finalBpm: debug?.finalBpm ?? null,
      agreement: debug?.agreement ?? (failed ? 'analysis-failed' : 'unknown'),
      confidenceLevel: debug?.confidenceLevel ?? 'n/a',
      customExact: exactMatch(debug?.customBpm ?? null, c.expectedBpm),
      rbpmExact: exactMatch(debug?.rbpmBpm ?? null, c.expectedBpm),
      ensembleExact: exactMatch(debug?.finalBpm ?? null, c.expectedBpm),
      customFamily: tempoFamilyMatch(debug?.customBpm ?? null, c.expectedBpm),
      rbpmFamily: tempoFamilyMatch(debug?.rbpmBpm ?? null, c.expectedBpm),
      ensembleFamily: tempoFamilyMatch(debug?.finalBpm ?? null, c.expectedBpm),
    });

    if (!failed) {
      await page.getByTestId('remove-file-button').click();
      await expect(page.getByTestId('file-analysis-inactive')).toBeVisible();
    }
  }

  const pct = (n: number) => `${((n / rows.length) * 100).toFixed(0)}%`;
  console.log('\n=== rbpm benchmark (synthetic patterns) ===');
  console.table(
    rows.map((r) => ({
      case: r.name,
      expected: r.expectedBpm,
      custom: r.customBpm,
      rbpm: r.rbpmBpm,
      final: r.finalBpm,
      agreement: r.agreement,
      confidence: r.confidenceLevel,
      'custom exact': r.customExact,
      'rbpm exact': r.rbpmExact,
      'ensemble exact': r.ensembleExact,
      'custom family': r.customFamily,
      'rbpm family': r.rbpmFamily,
      'ensemble family': r.ensembleFamily,
    })),
  );
  console.log(
    `custom  — exact accuracy: ${pct(rows.filter((r) => r.customExact).length)}, tempo-family accuracy: ${pct(rows.filter((r) => r.customFamily).length)}`,
  );
  console.log(
    `rbpm    — exact accuracy: ${pct(rows.filter((r) => r.rbpmExact).length)}, tempo-family accuracy: ${pct(rows.filter((r) => r.rbpmFamily).length)}`,
  );
  console.log(
    `ensemble— exact accuracy: ${pct(rows.filter((r) => r.ensembleExact).length)}, tempo-family accuracy: ${pct(rows.filter((r) => r.ensembleFamily).length)}`,
  );
  const conflictRate = pct(rows.filter((r) => r.agreement === 'conflict').length);
  console.log(`conflict rate: ${conflictRate}`);

  // Sanity floor, not a strict product gate: every case should at least
  // reach a result (or a legitimate no-stable-bpm error), and the ensemble
  // must not do WORSE than the custom engine alone on tempo-family accuracy
  // across this set.
  const ensembleFamilyCount = rows.filter((r) => r.ensembleFamily).length;
  const customFamilyCount = rows.filter((r) => r.customFamily).length;
  expect(ensembleFamilyCount).toBeGreaterThanOrEqual(customFamilyCount);
});
