/**
 * Cache Revalidation Utilities
 *
 * Handles on-demand revalidation of cached pages
 * Use these functions in API route handlers when data changes
 */

import { revalidatePath } from 'next/cache';

/**
 * Invalidate landing page cache when trending data changes
 */
export async function invalidateLanding(): Promise<void> {
  try {
    revalidatePath('/', 'page');
  } catch (error) {
    console.error('Failed to revalidate landing page:', error);
  }
}

/**
 * Invalidate pet profile cache
 * Use when pet data changes (bio, photo, etc.)
 */
export async function invalidatePetProfile(petId: string | bigint): Promise<void> {
  try {
    revalidatePath('/pet/[idSlug]', 'page');
  } catch (error) {
    console.error(`Failed to revalidate pet profile ${petId}:`, error);
  }
}

/**
 * Invalidate post detail cache
 * Use when post data changes (caption, likes, comments)
 */
export async function invalidatePostDetail(postId: string | bigint): Promise<void> {
  try {
    revalidatePath('/posts/[id]/[slug]', 'page');
  } catch (error) {
    console.error(`Failed to revalidate post ${postId}:`, error);
  }
}

/**
 * Invalidate posts list/feed cache
 * Use when new posts are created or posts are deleted
 */
export async function invalidatePosts(): Promise<void> {
  try {
    revalidatePath('/posts', 'page');
  } catch (error) {
    console.error('Failed to revalidate posts:', error);
  }
}

/**
 * Invalidate pets list cache
 * Use when pet is created, updated, or deleted
 */
export async function invalidatePets(): Promise<void> {
  try {
    revalidatePath('/pets', 'page');
  } catch (error) {
    console.error('Failed to revalidate pets:', error);
  }
}

/**
 * Invalidate feed (user-specific)
 * Use when user subscribes/unsubscribes or follows change
 */
export async function invalidateFeed(): Promise<void> {
  try {
    revalidatePath('/feed', 'page');
  } catch (error) {
    console.error('Failed to revalidate feed:', error);
  }
}

/**
 * Bulk invalidate multiple caches
 * Use when multiple related data changes (e.g., user deletes post)
 */
export async function invalidateMultiple(paths: string[]): Promise<void> {
  try {
    paths.forEach(path => revalidatePath(path, 'page'));
  } catch (error) {
    console.error('Failed to invalidate multiple paths:', error);
  }
}

/**
 * Usage Examples:
 *
 * // In API route handler for creating post
 * export async function POST(request: Request) {
 *   const post = await createPost(data);
 *   await invalidateLanding();
 *   await invalidatePosts();
 *   return Response.json(post);
 * }
 *
 * // When user likes a post
 * export async function POST(request: Request) {
 *   const like = await createLike(postId);
 *   await invalidatePostDetail(postId);
 *   await invalidateLanding(); // Trending might change
 *   return Response.json(like);
 * }
 */

