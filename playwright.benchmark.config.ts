import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

/**
 * Separate config for rbpm-benchmark.spec.ts only (see the exclusion note
 * in playwright.config.ts) — same environment/webServer as the main suite,
 * just without the testIgnore that keeps this CPU-heavy spec out of the
 * default parallel run.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/rbpm-benchmark.spec.ts',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    viewport: { width: 1920, height: 1080 },
  },
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          ...(executablePath ? { executablePath } : {}),
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
      },
    },
  ],
});
