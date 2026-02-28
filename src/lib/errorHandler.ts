/**
 * Server-Side Error Handling Utilities
 *
 * Provides utilities for consistent error handling in Server Components
 * and API routes
 */

/**
 * Handles database-related errors gracefully
 * Returns empty fallback data instead of crashing
 */
export function handleDbError<T>(
  error: unknown,
  context: string,
  fallback: T
): T {
  // Log detailed error for debugging
  if (error instanceof Error) {
    console.error(`Database error in ${context}:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  } else {
    console.error(`Unknown error in ${context}:`, error);
  }

  // Return fallback instead of throwing
  return fallback;
}

/**
 * Validates that a value is a valid BigInt ID
 * Useful for route parameters
 */
export function isValidBigIntId(value: unknown): value is bigint {
  try {
    if (typeof value === 'string') {
      BigInt(value);
      return true;
    }
    return typeof value === 'bigint';
  } catch {
    return false;
  }
}

/**
 * Safely parse BigInt from string
 * Returns null if invalid
 */
export function parseBigIntId(value: string): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/**
 * Creates a standardized error response
 * Useful for API routes
 */
export function createErrorResponse(
  status: number,
  message: string,
  details?: unknown
) {
  const isDev = process.env.NODE_ENV === 'development';
  const errorObject: { error: boolean; message: string; details?: unknown } = {
    error: true,
    message,
  };

  if (isDev && details) {
    errorObject.details = details;
  }

  return Response.json(errorObject, { status });
}

/**
 * Wraps async function with error handling
 * Useful for API route handlers
 */
export async function withErrorHandler<T>(
  fn: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    handleDbError(error, context, fallback);
    return fallback;
  }
}

/**
 * Usage Examples:
 *
 * // In Server Component
 * async function fetchPosts() {
 *   try {
 *     return await prisma.posts.findMany();
 *   } catch (error) {
 *     return handleDbError(error, 'fetchPosts', []);
 *   }
 * }
 *
 * // In API route
 * export async function POST(request: Request) {
 *   const id = request.headers.get('x-id');
 *   const bigintId = parseBigIntId(id ?? '');
 *
 *   if (!bigintId) {
 *     return createErrorResponse(400, 'Invalid ID format');
 *   }
 *
 *   const result = await withErrorHandler(
 *     () => prisma.posts.delete({ where: { id: bigintId } }),
 *     'deletePost'
 *   );
 *
 *   return Response.json(result);
 * }
 */

