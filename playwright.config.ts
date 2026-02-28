import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

function loadDotEnvFile(fileName = '.env') {
  const envPath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // strip optional quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function onlyStringEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

loadDotEnvFile('.env');

const e2eDbUrl = process.env.DATABASE_URL_E2E ?? process.env.DATABASE_URL;
if (!e2eDbUrl) {
  throw new Error('Missing DATABASE_URL_E2E (or DATABASE_URL) for Playwright webServer');
}

const e2ePort = Number(process.env.PW_PORT ?? 3001);
const e2eBaseUrl = `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: './e2e',

  // stability first
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['list']],
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },

  use: {
    baseURL: e2eBaseUrl,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    navigationTimeout: 30 * 1000,
    actionTimeout: 10 * 1000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `npm run build && npm run start -- -p ${e2ePort}`,
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 180 * 1000,
    env: {
      ...onlyStringEnv(process.env),
      NODE_ENV: 'test',
      DATABASE_URL: e2eDbUrl,
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_APP_URL: e2eBaseUrl,
    },
  },
});

