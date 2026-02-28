import { test as base, expect, Page, type BrowserContext } from '@playwright/test';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

/**
 * Playwright fixtures pro authenticated testy
 */
type AuthFixtures = {
  authedPage: Page;
  authedPage2: Page;
};

/**
 * Test credentials and fixtures for E2E tests
 */

export const TEST_USER_1 = {
  email: 'user1@example.com',
  password: 'Password123!',
  name: 'Test User 1',
};

export const TEST_USER_2 = {
  email: 'user2@example.com',
  password: 'Password456!',
  name: 'Test User 2',
};

/**
 * Setup test users - ensure they exist before running tests
 */
async function setupTestUsers(page: Page) {
  // Try to register or login test users
  // If they already exist, login will work
  // If not, we register them

  for (const user of [TEST_USER_1, TEST_USER_2]) {
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: user.email,
        password: user.password,
      },
    });

    // If login successful, user already exists
    if (loginResponse.ok()) {
      continue;
    }

    // Try to register the user (status might be 422 for wrong password, 404 for not found, etc.)
    const registerResponse = await page.request.post('/api/auth/register', {
      data: {
        email: user.email,
        password: user.password,
        password_confirmation: user.password,
        name: user.name,
      },
    });

    // Log any registration errors for debugging
    if (!registerResponse.ok()) {
      const registerErrorData = (await registerResponse.json().catch(() => ({} as ApiResponse))) as ApiResponse;
      console.error(`Failed to register test user ${user.email}:`, registerErrorData);
    }
  }
}

/**
 * Helper to login user and set session cookie
 */
export async function loginUser(page: Page, email: string, password: string) {
  // Navigate to home to establish context
  await page.goto('/');

  // Call login API endpoint
  const loginResponse = await page.request.post('/api/auth/login', {
    data: {
      email,
      password,
    },
  });

  const loginData = (await loginResponse.json()) as ApiResponse;

  if (!loginResponse.ok()) {
    console.error(`Login failed for ${email}. Status: ${loginResponse.status()}. Response:`, loginData);
    expect(loginResponse.ok()).toBeTruthy();
  }

  expect(loginData.ok).toBe(true);
  expect(loginData.user).toBeDefined();

  return loginData.user;
}

/**
 * Helper to register new user
 */
export async function registerUser(page: Page, email: string, password: string, name: string) {
  await page.goto('/');

  const registerResponse = await page.request.post('/api/auth/register', {
    data: {
      email,
      password,
      password_confirmation: password,
      name,
    },
  });

  expect(registerResponse.ok()).toBeTruthy();
  const data = (await registerResponse.json()) as ApiResponse;
  expect(data.ok).toBe(true);

  return data.user;
}

/**
 * Helper to logout user
 */
export async function logoutUser(page: Page) {
  const logoutResponse = await page.request.post('/api/auth/logout');
  expect(logoutResponse.ok()).toBeTruthy();
}

/**
 * Helper to check if user is authenticated
 */
export async function isUserAuthenticated(page: Page) {
  const meResponse = await page.request.get('/api/auth/me');
  if (!meResponse.ok()) return false;
  const data = (await meResponse.json()) as { isAuthed?: boolean };
  return data.isAuthed === true;
}

/**
 * Get current authenticated user info
 */
export async function getCurrentUser(page: Page) {
  const meResponse = await page.request.get('/api/auth/me');
  if (!meResponse.ok()) return null;
  const data = (await meResponse.json()) as ApiResponse;
  return data.user ?? null;
}

/**
 * Custom fixtures for authenticated tests
 */
export const test = base.extend<{
  authedPage: Page;
  authedPage2: Page;
}>({
  authedPage: async ({ browser, baseURL }, run) => {
    const storageStatePath = path.resolve(process.cwd(), 'e2e', '.auth', 'user1.json');

    const context: BrowserContext = await browser.newContext({
      baseURL: baseURL ?? undefined,
      storageState: storageStatePath,
    });

    const page = await context.newPage();
    await run(page);
    await context.close();
  },

  authedPage2: async ({ browser, baseURL }, run) => {
    const storageStatePath = path.resolve(process.cwd(), 'e2e', '.auth', 'user2.json');

    const context: BrowserContext = await browser.newContext({
      baseURL: baseURL ?? undefined,
      storageState: storageStatePath,
    });

    const page = await context.newPage();
    await run(page);
    await context.close();
  },
});

export { expect };

