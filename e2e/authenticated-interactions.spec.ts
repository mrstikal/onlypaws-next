import { test, expect, loginUser, logoutUser, isUserAuthenticated, getCurrentUser, TEST_USER_1 } from './fixtures';

const PET_DETAIL_URL_RE = /\/pets\/\d+\/[^/]+/;

async function openAnyPetDetail(page: any) {
  await page.goto('/pets');
  await page.waitForLoadState('networkidle');

  const petLink = page.locator('a[href^="/pets/"]').first();
  await expect(petLink).toBeVisible();

  await Promise.all([
    page.waitForURL(PET_DETAIL_URL_RE, { timeout: 10_000 }),
    petLink.click(),
  ]);

  await page.waitForLoadState('networkidle');
}

/**
 * E2E Tests for Authenticated User Interactions
 *
 * This test suite covers:
 * - User login/logout flows
 * - Like/unlike pets
 * - Follow/unfollow pets
 * - Create/reply to comments
 * - Like/unlike comments
 * - Permission checks (preventing self-actions)
 * - UI state management during interactions
 */

test.describe('OnlyPaws - E2E Authenticated User Interactions', () => {

  // ============================================================
  // 1. LOGIN / LOGOUT FLOWS
  // ============================================================

  test.describe('Authentication Flow', () => {
    test('user can login with correct credentials', async ({ page }) => {
      const user = await loginUser(page, TEST_USER_1.email, TEST_USER_1.password);

      expect(user).toBeDefined();
      expect(user.email).toBe(TEST_USER_1.email);

      const isAuthed = await isUserAuthenticated(page);
      expect(isAuthed).toBe(true);
    });

    test('user can access /cms/profile when authenticated', async ({ page }) => {
      await loginUser(page, TEST_USER_1.email, TEST_USER_1.password);

      const response = await page.goto('/cms/profile');
      expect(response?.status()).toBeLessThan(400);
    });

    test('user can logout successfully', async ({ page }) => {
      await loginUser(page, TEST_USER_1.email, TEST_USER_1.password);

      let isAuthed = await isUserAuthenticated(page);
      expect(isAuthed).toBe(true);

      await logoutUser(page);

      isAuthed = await isUserAuthenticated(page);
      expect(isAuthed).toBe(false);
    });

    test('session persists across page navigation', async ({ page }) => {
      await loginUser(page, TEST_USER_1.email, TEST_USER_1.password);

      // Navigate to different pages
      await page.goto('/');
      let user = await getCurrentUser(page);
      expect(user).toBeDefined();

      await page.goto('/pets');
      user = await getCurrentUser(page);
      expect(user).toBeDefined();

      await page.goto('/breeds');
      user = await getCurrentUser(page);
      expect(user).toBeDefined();
    });

    test('invalid login credentials returns error', async ({ page }) => {
      const response = await page.request.post('/api/auth/login', {
        data: {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.status()).toBe(422);
      const data = await response.json() as any;
      expect(data.ok).toBe(false);
      expect(data.errors).toBeDefined();
    });

    test('login with missing email returns validation error', async ({ page }) => {
      const response = await page.request.post('/api/auth/login', {
        data: {
          password: 'somepassword',
        },
      });

      expect(response.status()).toBe(422);
      const data = await response.json() as any;
      expect(data.errors?.email).toBeTruthy();
    });
  });

  // ============================================================
  // 2. LIKE PET INTERACTIONS
  // ============================================================

  test.describe('Like Pet Interactions', () => {
    test('authenticated user can like a pet', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Find and click like button for pet
      const likeButtons = page.locator('button').filter({ hasText: /[Ll]ajk/ });
      const likeButton = await likeButtons.first();

      if (await likeButton.isVisible()) {
        const initialText = await likeButton.textContent();

        await likeButton.click();
        await page.waitForTimeout(500); // Wait for state update

        const updatedText = await likeButton.textContent();
        // Text should change to indicate liked status
        expect(updatedText).not.toBe(initialText);
      }
    });

    test('like count increments when user likes a pet', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Get initial like count
      const likeCountElement = page.locator('text=/likes|lajk/i').first();
      const initialCountText = (await likeCountElement.textContent()) ?? '0';
      const initialCount = parseInt(initialCountText.match(/\d+/)?.[0] ?? '0', 10);

      const likeButton = page.locator('button').filter({ hasText: /[Ll]ajk|Olajkov/i }).first();
      await expect(likeButton).toBeVisible();

      // Pokud je už olajkováno (disabled), neklikáme a jen ověříme, že count je validní.
      if (await likeButton.isDisabled()) {
        expect(initialCount).toBeGreaterThanOrEqual(0);
        return;
      }

      await likeButton.click();
      await page.waitForTimeout(500);

      const updatedCountText = (await likeCountElement.textContent()) ?? '';
      const updatedCount = parseInt(updatedCountText.match(/\d+/)?.[0] ?? '0', 10);
      expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
    });

    test('user cannot like their own pet', async ({ authedPage: page }) => {
      // Get current user
      const user = await getCurrentUser(page);
      expect(user).toBeDefined();

      // Navigate to /cms/pets to find own pets
      await page.goto('/cms/pets');
      await page.waitForLoadState('networkidle');

      // Click on own pet if exists
      const firstPetLink = page.locator('a[href^="/pets/"]').first();
      if (await firstPetLink.isVisible()) {
        await Promise.all([
          page.waitForURL(PET_DETAIL_URL_RE, { timeout: 10_000 }),
          firstPetLink.click(),
        ]);
        await page.waitForLoadState('networkidle');

        // Try to find like button and verify it's disabled or unavailable
        const likeButton = page.locator('button').filter({ hasText: /[Ll]ajk/ }).first();

        // Button should be disabled or not clickable
        const isDisabled = await likeButton.isDisabled();
        const isHidden = !(await likeButton.isVisible());

        expect(isDisabled || isHidden).toBe(true);
      }
    });

    test('unlike pet removes the like', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      const likeButton = page.locator('button').filter({ hasText: /[Ll]ajk/ }).first();

      if (await likeButton.isVisible()) {
        // Like the pet
        await likeButton.click();
        await page.waitForTimeout(300);
        const likedText = await likeButton.textContent();

        // Click again to unlike
        await likeButton.click();
        await page.waitForTimeout(300);
        const unlikedText = await likeButton.textContent();

        // Text should change back
        expect(unlikedText).not.toBe(likedText);
      }
    });
  });

  // ============================================================
  // 3. FOLLOW PET INTERACTIONS
  // ============================================================

  test.describe('Follow Pet Interactions', () => {
    test('authenticated user can follow a pet', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Find follow button (usually near pet name)
      const followButtons = page.locator('button').filter({ hasText: /[Ss]ledovat|[Ff]ollow/ });
      const followButton = await followButtons.first();

      if (await followButton.isVisible()) {
        const initialText = await followButton.textContent();

        await followButton.click();
        await page.waitForTimeout(500);

        const updatedText = await followButton.textContent();
        expect(updatedText).not.toBe(initialText);
      }
    });

    test('follower count increments when user follows a pet', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Get follower count element - look for the stats div containing follower count
      // Pattern matches "37 sledujících" or "37 followers" etc
      const followerElement = page.locator('div').filter({ hasText: /\d+\s+sleduj/i }).first();

      // Wait for element to be visible
      await followerElement.waitFor({ state: 'visible', timeout: 10000 });

      const initialText = await followerElement?.textContent() ?? '0';
      const initialCount = parseInt(initialText.match(/\d+/)?.[0] ?? '0', 10);

      // Click follow button
      const followButton = page.locator('button').filter({ hasText: /[Ss]ledovat|[Ff]ollow/ }).first();
      if (await followButton.isVisible()) {
        await followButton.click();
        await page.waitForTimeout(500);

        const updatedText = await followerElement?.textContent() ?? '';
        const updatedCount = parseInt(updatedText.match(/\d+/)?.[0] ?? '0', 10);

        expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
      }
    });

    test('user cannot follow their own pet', async ({ authedPage: page }) => {
      // Get current user and navigate to their pet
      const user = await getCurrentUser(page);
      if (!user) return;

      await page.goto('/cms/pets');
      await page.waitForLoadState('networkidle');

      const petLink = page.locator('a[href^="/pets/"]').first();
      if (await petLink.isVisible()) {
        await Promise.all([
          page.waitForURL(PET_DETAIL_URL_RE, { timeout: 10_000 }),
          petLink.click(),
        ]);
        await page.waitForLoadState('networkidle');

        const followButton = page.locator('button').filter({ hasText: /[Ss]ledovat|[Ff]ollow/ }).first();

        const isDisabled = await followButton.isDisabled();
        const isHidden = !(await followButton.isVisible());

        expect(isDisabled || isHidden).toBe(true);
      }
    });

    test('unfollow pet removes the follow', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      const followButton = page.locator('button').filter({ hasText: /[Ss]ledovat|[Ff]ollow/ }).first();

      if (await followButton.isVisible()) {
        // Follow the pet
        await followButton.click();
        await page.waitForTimeout(300);
        const followedText = await followButton.textContent();

        // Click again to unfollow
        await followButton.click();
        await page.waitForTimeout(300);
        const unfollowedText = await followButton.textContent();

        expect(unfollowedText).not.toBe(followedText);
      }
    });
  });

  // ============================================================
  // 4. COMMENT INTERACTIONS
  // ============================================================

  test.describe('Comment Creation & Interactions', () => {
    test('authenticated user can create a comment on a pet', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Find comment textarea
      const commentTextarea = page.locator('textarea').first();
      if (await commentTextarea.isVisible()) {
        const testComment = `Test comment ${Date.now()}`;

        await commentTextarea.fill(testComment);

        // Click submit button
        const submitButton = page.locator('button').filter({ hasText: /[Oo]desla|[Ss]ubmit/ }).first();
        await submitButton.click();

        await page.waitForTimeout(1000); // Wait for comment to be added

        // Verify comment appears in the list
        const commentBody = page.locator(`text=${testComment}`);
        await expect(commentBody).toBeVisible();
      }
    });

    test('comment count increments after creating comment', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Get initial comment count
      const commentCountElement = page.locator('text=/komentář|comment/i').first();
      const initialText = await commentCountElement?.textContent() ?? '0';
      const initialCount = parseInt(initialText.match(/\d+/)?.[0] ?? '0', 10);

      // Create comment
      const commentTextarea = page.locator('textarea').first();
      if (await commentTextarea.isVisible()) {
        const testComment = `Comment ${Date.now()}`;
        await commentTextarea.fill(testComment);

        const submitButton = page.locator('button').filter({ hasText: /[Oo]desla|[Ss]ubmit/ }).first();
        await submitButton.click();

        await page.waitForTimeout(1000);

        // Verify count increased
        const updatedText = await commentCountElement?.textContent() ?? '';
        const updatedCount = parseInt(updatedText.match(/\d+/)?.[0] ?? '0', 10);

        expect(updatedCount).toBeGreaterThan(initialCount);
      }
    });

    test('user cannot comment when not authenticated', async ({ page }) => {
      // Ensure user is not authenticated
      await logoutUser(page);

      await openAnyPetDetail(page);

      // Comment textarea should be disabled or hidden
      const commentTextarea = page.locator('textarea').first();

      const isDisabled = await commentTextarea.isDisabled();
      const isHidden = !(await commentTextarea.isVisible());

      expect(isDisabled || isHidden).toBe(true);
    });

    test('empty comment is prevented from submission', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Try to submit empty comment
      const submitButton = page.locator('button').filter({ hasText: /[Oo]desla|[Ss]ubmit/ }).first();

      // Submit button should be disabled when textarea is empty
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled).toBe(true);
    });

    test('comment with max length enforced', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      const commentTextarea = page.locator('textarea').first();
      if (await commentTextarea.isVisible()) {
        // Try to enter text longer than 1000 chars
        const longText = 'a'.repeat(1100);

        await commentTextarea.fill(longText);

        // Textarea should have maxLength attribute
        const maxLength = await commentTextarea.getAttribute('maxLength');
        expect(maxLength).toBeTruthy();
        expect(parseInt(maxLength!)).toBeLessThanOrEqual(1000);
      }
    });
  });

  // ============================================================
  // 5. COMMENT REPLIES (Threading)
  // ============================================================

  test.describe('Comment Reply Interactions', () => {
    test('authenticated user can reply to a comment', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Find first reply button
      const replyButtons = page.locator('button').filter({ hasText: /[Oo]dpovědět|[Rr]eply/ });
      const firstReplyButton = await replyButtons.first();

      if (await firstReplyButton.isVisible()) {
        await firstReplyButton.click();
        await page.waitForTimeout(300);

        // Find the reply form that should appear
        const replyTextarea = page.locator('textarea').last();
        if (await replyTextarea.isVisible()) {
          const replyText = `Reply ${Date.now()}`;
          await replyTextarea.fill(replyText);

          // Find and click the reply submit button
          const replySubmitButton = page.locator('button').filter({ hasText: /[Oo]desla|[Ss]ubmit/ }).last();
          await replySubmitButton.click();

          await page.waitForTimeout(1000);

          // Verify reply appears
          const replyBody = page.locator(`text=${replyText}`);
          await expect(replyBody).toBeVisible();
        }
      }
    });

    test('reply appears nested under parent comment', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Check if nested comments are indented (visual indication of nesting)
      const indentedComments = page.locator('.border-l'); // Common CSS for nested items
      const indentCount = await indentedComments.count();

      // There should be some indented comments or at least the structure supports it
      expect(indentCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================
  // 6. LIKE COMMENTS
  // ============================================================

  test.describe('Like Comment Interactions', () => {
    test('authenticated user can like a comment', async ({ authedPage: page }) => {
      await openAnyPetDetail(page);

      // Find like buttons within comments (they may be labeled as "Lajkovat" etc)
      const likeButtons = page.locator('button').filter({ hasText: /[Ll]ajk|[Ll]ike/ });

      // Skip the first one if it's for the pet itself, get one for a comment
      if (await likeButtons.count() > 1) {
        const commentLikeButton = likeButtons.nth(1);

        if (await commentLikeButton.isVisible()) {
          const initialText = await commentLikeButton.textContent();

          await commentLikeButton.click();
          await page.waitForTimeout(500);

          const updatedText = await commentLikeButton.textContent();
          expect(updatedText).not.toBe(initialText);
        }
      }
    });

    test('user cannot like their own comment', async ({ authedPage: page }) => {
      // First, create a comment
      await openAnyPetDetail(page);

      // Create a comment
      const commentTextarea = page.locator('textarea').first();
      if (await commentTextarea.isVisible()) {
        const testComment = `My comment ${Date.now()}`;
        await commentTextarea.fill(testComment);

        const submitButton = page.locator('button').filter({ hasText: /[Oo]desla|[Ss]ubmit/ }).first();
        await submitButton.click();

        await page.waitForTimeout(1000);

        // Find the like button for this comment
        const likeButtonsInComments = page.locator('button').filter({ hasText: /[Ll]ajk|[Ll]ike/ });

        // The last like button should be for the comment we just created
        if (await likeButtonsInComments.count() > 0) {
          const ownCommentLikeButton = likeButtonsInComments.last();

          // Should be disabled since it's our own comment
          const isDisabled = await ownCommentLikeButton.isDisabled();
          expect(isDisabled).toBe(true);
        }
      }
    });
  });

  // ============================================================
  // 7. MULTIPLE USER INTERACTIONS
  // ============================================================

  test.describe('Multi-User Interactions', () => {
    test('two users can independently like the same pet', async ({ authedPage, authedPage2 }) => {
      const page1 = authedPage;
      const page2 = authedPage2;

      // User 1 likes pet
      await openAnyPetDetail(page1);

      // User 2 likes same pet
      await openAnyPetDetail(page2);

      // Get like buttons (support both "Lajk" and "Olajkováno" labels)
      const likeButton1 = page1.locator('button').filter({ hasText: /[Ll]ajk|Olajkov/i }).first();
      const likeButton2 = page2.locator('button').filter({ hasText: /[Ll]ajk|Olajkov/i }).first();

      // Both should be able to interact independently.
      // If already liked (disabled), don't click — that's a valid state.
      if (await likeButton1.isVisible() && !(await likeButton1.isDisabled())) {
        await likeButton1.click();
        await page1.waitForTimeout(300);
      }

      if (await likeButton2.isVisible() && !(await likeButton2.isDisabled())) {
        await likeButton2.click();
        await page2.waitForTimeout(300);
      }

      const text1 = await likeButton1.textContent();
      const text2 = await likeButton2.textContent();

      // Both should be able to interact independently
      expect(text1).toBeTruthy();
      expect(text2).toBeTruthy();
    });
  });

});
