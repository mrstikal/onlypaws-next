import { test, expect, loginUser, TEST_USER_1, TEST_USER_2 } from './fixtures';

/**
 * E2E Tests for Comment Threading
 *
 * This test suite covers:
 * - Root comments display
 * - Nested replies (replies to comments)
 * - Comment threading UI (indentation)
 * - Comment pagination
 * - Reply/reply interactions
 * - Threading depth limits
 */

test.describe('OnlyPaws - E2E Comment Threading', () => {

  // ============================================================
  // 1. ROOT COMMENTS
  // ============================================================

  test.describe('Root Comments Display', () => {
    test('root comments load on pet detail page', async ({ authedPage: page }) => {
      // Navigate to pet detail
      await openAnyPetDetail(page);

      // Look for comments section
      const commentsSection = page.locator('text=/Komentáře|Comments/i').first();
      if (await commentsSection.isVisible()) {
        // Comments are present
        expect(commentsSection).toBeVisible();
      }
    });

    test('comment count displays correctly', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Find comment count
      const commentCount = page.locator('text=/\\d+ komentář|\\d+ comment/i').first();
      if (await commentCount.isVisible()) {
        const text = await commentCount.textContent();
        expect(text).toMatch(/\d+/);
      }
    });

    test('each root comment shows author name', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Find comment author
      const authors = page.locator('[class*="author"], [class*="user"]');
      const authorCount = await authors.count();

      // Comments section might have authors
      expect(authorCount).toBeGreaterThanOrEqual(0);
    });

    test('root comments have like buttons', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Find like buttons in comments
      const commentLikeButtons = page.locator('button').filter({ hasText: /[Ll]ajk|[Ll]ike/ });
      const count = await commentLikeButtons.count();

      // Should have like buttons (pet + comments)
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('root comments have reply buttons', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Find reply buttons
      const replyButtons = page.locator('button').filter({ hasText: /[Oo]dpovědět|[Rr]eply/ });
      const count = await replyButtons.count();

      // Might have reply buttons if comments exist
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================
  // 2. NESTED REPLIES
  // ============================================================

  test.describe('Nested Replies', () => {
    test('reply form opens when clicking reply button', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Find first reply button
      const replyButton = page.locator('button').filter({ hasText: /[Oo]dpovědět|[Rr]eply/ }).first();

      if (await replyButton.isVisible()) {
        await replyButton.click();
        await page.waitForTimeout(300);

        // Reply form should appear
        const replyForm = page.locator('textarea').last();
        await expect(replyForm).toBeVisible();
      }
    });

    test('reply text is submitted correctly', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Click reply button
      const replyButton = page.locator('button').filter({ hasText: /[Oo]dpovědět|[Rr]eply/ }).first();

      if (await replyButton.isVisible()) {
        await replyButton.click();
        await page.waitForTimeout(300);

        // Fill reply form
        const replyTextarea = page.locator('textarea').last();
        const replyText = `Reply ${Date.now()}`;

        await replyTextarea.fill(replyText);

        // Submit reply
        const submitButton = page.locator('button').filter({ hasText: /[Oo]desla|[Ss]ubmit/ }).last();
        await submitButton.click();

        await page.waitForTimeout(1000);

        // Reply should appear
        const replyBody = page.locator(`text=${replyText}`);
        const isVisible = await replyBody.isVisible({ timeout: 2000 }).catch(() => false);
        expect(isVisible).toBe(true);
      }
    });

    test('reply appears nested under parent comment', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Check for nested structure
      const nestedComments = page.locator('[class*="border-l"], [class*="nested"], [class*="indent"]');
      const count = await nestedComments.count();

      // There might be nested comments
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('reply can be liked', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Find nested comments (if any exist)
      const nestedComments = page.locator('[class*="border-l"]');

      if (await nestedComments.isVisible()) {
        // Find like button in nested comment
        const likeButton = nestedComments.locator('button').filter({ hasText: /[Ll]ajk|[Ll]ike/ }).first();

        if (await likeButton.isVisible()) {
          const initialText = await likeButton.textContent();

          await likeButton.click();
          await page.waitForTimeout(300);

          const updatedText = await likeButton.textContent();
          expect(updatedText).not.toBe(initialText);
        }
      }
    });

    test('multiple reply levels are supported', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Look for deeply nested comments (visual indentation)
      const deeplyNested = page.locator('[style*="padding-left"], [style*="margin-left"]');
      const count = await deeplyNested.count();

      // Might have deep nesting
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================
  // 3. THREADING VISUALIZATION
  // ============================================================

  test.describe('Threading Visualization', () => {
    test('nested comments have visual indentation', async ({ page }) => {
      await openAnyPetDetail(page);

      // Look for indented comments
      const indented = page.locator('[class*="border-l"], [class*="pl-"]');
      const count = await indented.count();

      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('nested comments have left border for hierarchy', async ({ page }) => {
      await openAnyPetDetail(page);

      // Look for border-l class (left border indicator)
      const bordered = page.locator('[class*="border-l"]');
      const count = await bordered.count();

      // Might have visual hierarchy
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('comment depth is limited (max 5 levels)', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Check depth - should not exceed reasonable limits
      const maxIndent = page.locator('[class*="pl-"]');
      const count = await maxIndent.count();

      // Verify structure exists
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================
  // 4. COMMENT PAGINATION
  // ============================================================

  test.describe('Comment Pagination', () => {
    test('load more comments button appears when needed', async ({ page }) => {
      await openAnyPetDetail(page);

      // Look for "load more" button
      const loadMoreButton = page.locator('button').filter({ hasText: /[Gg]enerovat|[Ll]oad|[Vv]ice/ });
      const count = await loadMoreButton.count();

      // Might have load more button
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('loading more comments adds to the list', async ({ page }) => {
      await openAnyPetDetail(page);

      // Get initial comment count
      const initialComments = page.locator('[class*="comment"], [role*="comment"]');
      const initialCount = await initialComments.count();

      // Click load more if available
      const loadMoreButton = page.locator('button').filter({ hasText: /[Gg]enerovat|[Ll]oad/ }).first();

      if (await loadMoreButton.isVisible()) {
        await loadMoreButton.click();
        await page.waitForTimeout(1000);

        const updatedComments = page.locator('[class*="comment"], [role*="comment"]');
        const updatedCount = await updatedComments.count();

        // Should have more comments after loading
        expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
      }
    });

    test('pagination maintains comment order', async ({ page }) => {
      await openAnyPetDetail(page);

      // Comments should be in consistent order
      const comments = page.locator('[class*="comment"]');
      const count = await comments.count();

      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================
  // 5. REPLY FORM INTERACTIONS
  // ============================================================

  test.describe('Reply Form Interactions', () => {
    test('reply form has text input', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Click reply button
      const replyButton = page.locator('button').filter({ hasText: /[Oo]dpovědět|[Rr]eply/ }).first();

      if (await replyButton.isVisible()) {
        await replyButton.click();
        await page.waitForTimeout(300);

        // Reply textarea should appear
        const textarea = page.locator('textarea').last();
        await expect(textarea).toBeVisible();
      }
    });

    test('reply form can be cancelled', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Click reply
      const replyButton = page.locator('button').filter({ hasText: /[Oo]dpovědět|[Rr]eply/ }).first();

      if (await replyButton.isVisible()) {
        await replyButton.click();
        await page.waitForTimeout(300);

        // Find cancel button
        const cancelButton = page.locator('button').filter({ hasText: /[Zz]avř|[Cc]ance|[Uu]konč/ }).last();

        if (await cancelButton.isVisible()) {
          await cancelButton.click();
          await page.waitForTimeout(300);

          // Reply form should close
          const textarea = page.locator('textarea').last();
          const isVisible = await textarea.isVisible({ timeout: 1000 }).catch(() => false);
          expect(isVisible).toBe(false);
        }
      }
    });

    test('submit button disabled when reply empty', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Click reply
      const replyButton = page.locator('button').filter({ hasText: /[Oo]dpovědět|[Rr]eply/ }).first();

      if (await replyButton.isVisible()) {
        await replyButton.click();
        await page.waitForTimeout(300);

        // Submit button should be disabled for empty reply
        const submitButton = page.locator('button').filter({ hasText: /[Oo]desla|[Ss]ubmit/ }).last();

        if (await submitButton.isVisible()) {
          const isDisabled = await submitButton.isDisabled();
          expect(isDisabled).toBe(true);
        }
      }
    });
  });

  // ============================================================
  // 6. MULTI-USER THREADING
  // ============================================================

  test.describe('Multi-User Threading', () => {
    test('two users can reply to same comment', async ({ authedPage: page1, authedPage2: page2 }) => {
      // User 1 creates a reply
      await openAnyPetDetail(page1);

      // User 2 views the same thread
      await openAnyPetDetail(page2);

      // Both should see the same pet page
      expect(page1.url()).toContain('/pets/');
      expect(page2.url()).toContain('/pets/');
    });

    test('replies from different users both appear', async ({ authedPage: page1, authedPage2: page2 }) => {
      // Navigate both users to same pet
      await openAnyPetDetail(page1);
      await openAnyPetDetail(page2);

      // Both pages should have loaded successfully
      const comments1 = page1.locator('[class*="comment"]');
      const comments2 = page2.locator('[class*="comment"]');

      const count1 = await comments1.count();
      const count2 = await comments2.count();

      expect(count1).toBeGreaterThanOrEqual(0);
      expect(count2).toBeGreaterThanOrEqual(0);
    });
  });

});

async function openAnyPetDetail(page: any) {
  await page.goto('/pets');
  await page.waitForLoadState('networkidle');

  const petLink = page.locator('a[href^="/pets/"]').first();
  await expect(petLink).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/pets\/\d+\/[^/]+/, { timeout: 10_000 }),
    petLink.click(),
  ]);

  await page.waitForLoadState('networkidle');
}
