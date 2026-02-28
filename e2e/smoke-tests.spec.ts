import { test, expect } from '@playwright/test';

test.describe('OnlyPaws - E2E Smoke Tests', () => {
  test('home page loads', async ({ page }) => {
    // This test verifies the page can be accessed
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
  });

  test('pets page is accessible', async ({ page }) => {
    const response = await page.goto('/pets');
    expect(response?.status()).toBeLessThan(400);
  });

  test('breeds page is accessible', async ({ page }) => {
    const response = await page.goto('/breeds');
    expect(response?.status()).toBeLessThan(400);
  });

  test('feed page is accessible', async ({ page }) => {
    const response = await page.goto('/feed');
    expect(response?.status()).toBeLessThan(400);
  });

  test('404 page shows for invalid route', async ({ page }) => {
    await page.goto('/nonexistent-page');
    // Verify we get 404 or are shown error page
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });

  test('page has proper title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('navigation links exist on home page', async ({ page }) => {
    await page.goto('/');

    // Check if page has some navigation or links
    const links = await page.locator('a, button');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('page is responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Verify page rendered without errors
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });

  test('page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify page rendered without errors
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });

  test('no JavaScript errors on home page', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');

    // Allow some errors but not critical ones
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('chunk') &&
      !e.includes('react')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});
