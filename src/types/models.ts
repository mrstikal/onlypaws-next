/**
 * Domain Model Types
 */

export type Pet = {
  id: string;
  user_id: string;
  breed_id: string | null;
  name: string;
  age_years: number | null;
  age_months: number | null;
  bio: string | null;
  profile_picture: string | null;
  followers_count: number;
  posts_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string | null;
  updated_at: string | null;
};

export type Post = {
  id: string;
  pet_id: string;
  caption: string | null;
  media_url: string;
  media_type: 'image' | 'video' | string;
  likes_count: number;
  comments_count: number;
  is_premium: boolean;
  subscription_tier_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Comment = {
  id: string;
  body: string;
  user_id: string;
  commentable_type: string;
  commentable_id: string;
  parent_id: string | null;
  likes_count: number;
  created_at: string | null;
  updated_at: string | null;
};

export type Like = {
  id: string;
  likeable_type: string;
  likeable_id: string;
  user_id: string;
  created_at: string | null;
  updated_at: string | null;
};

export type Follow = {
  id: string;
  follower_type: string;
  follower_id: string;
  followable_type: string;
  followable_id: string;
  created_at: string | null;
  updated_at: string | null;
};

export type Breed = {
  id: string;
  name: string;
  species: 'dog' | 'cat' | string;
  api_id: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SubscriptionTier = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Subscription = {
  id: string;
  user_id: string;
  subscription_tier_id: string;
  starts_at: string;
  ends_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

