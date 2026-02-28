import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

async function ensureDir(p: string) {
  await fs.promises.mkdir(p, { recursive: true });
}

test('auth: create storageState for test users', async ({ browser, baseURL }) => {
  expect(baseURL).toBeTruthy();

  const authDir = path.resolve(process.cwd(), 'e2e', '.auth');
  await ensureDir(authDir);

  // User 1
  const ctx1 = await browser.newContext({ baseURL });
  const page1 = await ctx1.newPage();

  await page1.goto('/');
  const r1 = await page1.request.post('/api/auth/login', {
    data: { email: 'user1@example.com', password: 'Password123!' },
  });

  const j1 = await r1.json().catch(() => ({}));
  expect(r1.ok(), `user1 login failed: ${r1.status()} ${JSON.stringify(j1)}`).toBeTruthy();

  await ctx1.storageState({ path: path.join(authDir, 'user1.json') });
  await ctx1.close();

  // User 2
  const ctx2 = await browser.newContext({ baseURL });
  const page2 = await ctx2.newPage();

  await page2.goto('/');
  const r2 = await page2.request.post('/api/auth/login', {
    data: { email: 'user2@example.com', password: 'Password456!' },
  });

  const j2 = await r2.json().catch(() => ({}));
  expect(r2.ok(), `user2 login failed: ${r2.status()} ${JSON.stringify(j2)}`).toBeTruthy();

  await ctx2.storageState({ path: path.join(authDir, 'user2.json') });
  await ctx2.close();
});