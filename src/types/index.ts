/**
 * Common/Shared Types
 */

export type MediaFolder = 'pets' | 'posts';

export type TierSlug = 'free' | 'basic' | 'vip' | 'ultra';

export type CmsResource =
  | 'pets'
  | 'posts'
  | 'comments'
  | 'likes'
  | 'follows'
  | 'subscription_tiers'
  | 'users';

export type CmsAction = 'list' | 'view' | 'create' | 'update' | 'delete';

export type BreedSpecies = 'dog' | 'cat';

export type MediaType = 'image' | 'video';

export interface PaginationParams {
  page?: number | string;
  per_page?: number | string;
}

export interface FilterParams {
  q?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

