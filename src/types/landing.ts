export type TopPet = {
  id: string;
  name: string;
  slug: string;
  profile_picture: string | null;
  followers_count: number;
  posts_count: number;
};

export type PostCardModel = {
  id: string;
  caption: string | null;
  media_url: string;
  likes_count: number;
  comments_count: number;
  is_premium: boolean;
  locked: boolean;
  created_at: string | null;
  pet: { name: string } | null;
  required_tier: { name: string } | null;
  required_tier_slug: string;
};
