/**
 * Utility functions for parsing and validating request parameters
 */

/**
 * Clamp integer value within min and max bounds
 * @param value - String value from query parameter
 * @param def - Default value if parsing fails
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped integer value
 */
export function clampInt(
  value: string | null,
  def: number,
  min: number,
  max: number
): number {
  const n = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}


