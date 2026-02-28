/**
 * Application Routes and Navigation Constants
 */

export const ROUTES = {
  // Public routes
  HOME: '/',
  LANDING: '/',
  FEED: '/feed',
  PETS: '/pets',
  BREEDS: '/breeds',
  POSTS: '/posts',

  // Auth routes
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
  },

  // CMS routes
  CMS: {
    ROOT: '/cms',
    PROFILE: '/cms/profile',
    DASHBOARD: '/cms/profile', // backwards-compatible alias
    PETS: '/cms/pets',
    POSTS: '/cms/posts',
    COMMENTS: '/cms/comments',
    LIKES: '/cms/likes',
    FOLLOWS: '/cms/follows',
    BREEDS: '/cms/breeds',
    PETS_NEW: '/cms/pets/new',
    POSTS_NEW: '/cms/posts/new',
    BREEDS_NEW: '/cms/breeds/new',

    pet: (id: string) => `/cms/pets/${id}`,
    petEdit: (id: string) => `/cms/pets/${id}/edit`,
    post: (id: string) => `/cms/posts/${id}`,
    postEdit: (id: string) => `/cms/posts/${id}/edit`,
    comment: (id: string) => `/cms/comments/${id}`,
    commentEdit: (id: string) => `/cms/comments/${id}/edit`,
    like: (id: string) => `/cms/likes/${id}`,
    follow: (id: string) => `/cms/follows/${id}`,
    breed: (id: string) => `/cms/breeds/${id}`,
    breedEdit: (id: string) => `/cms/breeds/${id}/edit`,

    ADMIN: {
      ROOT: '/cms/admin',
      PETS: '/cms/admin/pets',
      POSTS: '/cms/admin/posts',
      COMMENTS: '/cms/admin/comments',
      LIKES: '/cms/admin/likes',
      FOLLOWS: '/cms/admin/follows',
      BREEDS: '/cms/admin/breeds',
      USERS: '/cms/admin/users',
      SUBSCRIPTION_TIERS: '/cms/admin/subscription-tiers',
      SUBSCRIPTION_TIERS_NEW: '/cms/admin/subscription-tiers/new',

      user: (id: string) => `/cms/admin/users/${id}`,
      userEdit: (id: string) => `/cms/admin/users/${id}/edit`,
      subscriptionTier: (id: string) => `/cms/admin/subscription-tiers/${id}`,
      subscriptionTierEdit: (id: string) => `/cms/admin/subscription-tiers/${id}/edit`,
    },

    SUBSCRIPTION_TIERS: '/cms/admin/subscription-tiers', // backwards-compatible alias
  },

  // API routes
  API: {
    BASE: '/api/v1',
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      LOGOUT: '/api/auth/logout',
      ME: '/api/auth/me',
    },
    POSTS: '/api/posts',
    PETS: '/api/pets',
    FEED: '/api/feed',
    BREEDS: '/api/breeds',
  },

  // Pet/Post detail routes
  pet: (id: string, slug: string) => `/pets/${id}/${slug}`,
  post: (id: string, slug: string) => `/posts/${id}/${slug}`,
} as const;
