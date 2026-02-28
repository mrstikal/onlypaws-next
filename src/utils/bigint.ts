/**
 * Utility functions for BigInt handling
 */

/**
 * Convert BigInt to string safely
 * @param value - Value that might be BigInt
 * @returns String representation of the value
 */
export function bigIntToString(value: unknown): string {
  return typeof value === 'bigint' ? value.toString() : String(value);
}

/**
 * Parse string parameter to BigInt
 * @param raw - Raw string from URL parameter
 * @returns BigInt or null if parsing fails
 */
export function parseBigIntParam(raw: string): bigint | null {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

