/**
 * Pluralize Czech words based on count
 * @param count Number to base pluralization on
 * @param singular Form for 1 (e.g., "lajk")
 * @param paucal Form for 2-4 (e.g., "lajky")
 * @param plural Form for 5+ (e.g., "lajků")
 * @returns Formatted string with count and proper form
 */
export function pluralizeCS(
  count: number,
  singular: string,
  paucal: string,
  plural: string
): string {
  if (count === 1) {
    return `${count} ${singular}`;
  }
  if (count >= 2 && count <= 4) {
    return `${count} ${paucal}`;
  }
  return `${count} ${plural}`;
}

/**
 * Format likes count in Czech
 */
export function formatLikesCS(count: number): string {
  return pluralizeCS(count, 'lajk', 'lajky', 'lajků');
}

/**
 * Format comments count in Czech
 */
export function formatCommentsCS(count: number): string {
  return pluralizeCS(count, 'komentář', 'komentáře', 'komentářů');
}

/**
 * Format followers count in Czech
 */
export function formatFollowersCS(count: number): string {
  return pluralizeCS(count, 'sledující', 'sledující', 'sledujících');
}

/**
 * Format comments count in Czech
 */
export function formatPostsCS(count: number): string {
  return pluralizeCS(count, 'příspěvek', 'příspěvky', 'příspěvků');
}

