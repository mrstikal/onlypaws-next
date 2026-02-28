/**
 * Application Limits and Constraints
 */

export const LIMITS = {
  // Upload limits
  UPLOAD: {
    MAX_FILE_SIZE: 25 * 1024 * 1024, // 25 MB
    MAX_FILE_SIZE_AVATAR: 10 * 1024 * 1024, // 10 MB
    MAX_FILE_SIZE_MB: 25,
    MAX_FILE_SIZE_AVATAR_MB: 10,
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PER_PAGE: 12,
    MIN_PER_PAGE: 6,
    MAX_PER_PAGE: 60,
    MAX_PAGE: 1000,
  },

  // Authentication
  AUTH: {
    MIN_PASSWORD_LENGTH: 8,
    SESSION_DURATION_DAYS: 30,
    REMEMBER_ME_DAYS: 30,
  },

  // Content
  CONTENT: {
    MAX_CAPTION_LENGTH: 500,
    MAX_BIO_LENGTH: 500,
    MAX_COMMENT_LENGTH: 1000,
    MAX_BREED_NAME_LENGTH: 255,
  },

  // Limits for security
  SECURITY: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_ATTEMPT_WINDOW_MINUTES: 15,
    SESSION_CLEANUP_DAYS: 30,
  },
} as const;

