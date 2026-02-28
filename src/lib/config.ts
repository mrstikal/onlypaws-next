/**
 * Application configuration constants
 */

export const config = {
  // File upload limits
  upload: {
    maxBytes: 25 * 1024 * 1024, // 25 MB pro posty
    maxBytesAvatar: 10 * 1024 * 1024, // 10 MB pro avatary
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
  },

  // Pagination limits
  pagination: {
    defaultPerPage: 12,
    maxPerPage: 60,
    minPerPage: 6,
    maxPage: 1000, // Sníženo z 10,000 pro DoS prevenci
  },

  // Authentication
  auth: {
    minPasswordLength: 8,
    sessionCookieName: 'op_session',
    rememberMeDays: 30,
    sessionCleanupDays: 30, // Cleanup sessions older than X days
  },

  // Media paths
  media: {
    storageRoot: 'storage/media',
    publicPath: '/media',
  },

  // Security
  security: {
    maxLoginAttempts: 5,
    loginAttemptWindowMinutes: 15,
  },
} as const;

export type Config = typeof config;

