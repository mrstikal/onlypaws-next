/**
 * Input Validation Utilities
 */

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Returns error message or null if valid
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Heslo musí mít alespoň 8 znaků.';
  }

  // Optional: Add more strict validation
  // const hasUpperCase = /[A-Z]/.test(password);
  // const hasLowerCase = /[a-z]/.test(password);
  // const hasNumbers = /\d/.test(password);
  // if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
  //   return 'Heslo musí obsahovat velká písmena, malá písmena a čísla.';
  // }

  return null;
}

/**
 * Validate URL slug format
 */
export function validateSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Validate number is within range
 */
export function validateRange(
  value: number,
  min: number,
  max: number
): boolean {
  return value >= min && value <= max;
}

/**
 * Validate array of IDs
 */
export function validateIds(ids: unknown[]): boolean {
  return Array.isArray(ids) && ids.every(id => typeof id === 'string' || typeof id === 'number');
}

/**
 * Validate BigInt parameter
 */
export function validateBigInt(value: unknown): bigint | null {
  try {
    if (typeof value === 'string' || typeof value === 'number') {
      return BigInt(value);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate pagination params
 */
export function validatePaginationParams(
  page: unknown,
  perPage: unknown
): { page: number; perPage: number } | null {
  const p = Number(page);
  const pp = Number(perPage);

  if (!Number.isFinite(p) || !Number.isFinite(pp)) {
    return null;
  }

  if (p < 1 || pp < 1) {
    return null;
  }

  return { page: p, perPage: pp };
}

