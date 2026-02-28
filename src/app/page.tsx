import type { Metadata } from 'next';
import OnlyPawsShell from '@/components/onlypaws/OnlyPawsShell';
import LandingClient from '@/app/ui/LandingClient';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/utils/mediaUrl';
import { bigIntToString } from '@/utils/bigint';
import { slugify } from '@/utils/slugify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'OnlyPaws',
};

type TopPet = {
  id: string;
  name: string;
  slug: string;
  profile_picture: string | null;
  followers_count: number;
  posts_count: number;
};

type PostCardModel = {
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

async function getLandingData(): Promise<{
  topPets: TopPet[];
  trendingPosts: PostCardModel[];
}> {
  try {
    const [topPetsRaw, trendingPostsRaw] = await Promise.all([
      prisma.pets.findMany({
        orderBy: [{ followers_count: 'desc' }, { id: 'desc' }],
        take: 8,
        select: {
          id: true,
          name: true,
          profile_picture: true,
          followers_count: true,
          posts_count: true,
        },
      }),
      prisma.posts.findMany({
        orderBy: [{ likes_count: 'desc' }, { id: 'desc' }],
        take: 12,
        include: {
          pet: { select: { name: true } },
          subscription_tiers: { select: { name: true, slug: true } },
        },
      }),
    ]);

    const topPets: TopPet[] = topPetsRaw.map((p) => ({
      id: bigIntToString(p.id),
      name: p.name,
      slug: slugify(p.name ?? 'pet'),
      profile_picture: publicUrl('pets', p.profile_picture),
      followers_count: p.followers_count ?? 0,
      posts_count: p.posts_count ?? 0,
    }));

    const trendingPosts = trendingPostsRaw.map((p) => ({
      id: bigIntToString(p.id),
      caption: p.caption,
      media_url: publicUrl('posts', p.media_url) ?? '',
      likes_count: p.likes_count ?? 0,
      comments_count: p.comments_count ?? 0,
      is_premium: Boolean(p.is_premium),
      locked: false,
      created_at: p.created_at ? new Date(p.created_at).toISOString() : null,
      pet: p.pet ? { name: p.pet.name } : null,
      required_tier: p.subscription_tiers ? { name: p.subscription_tiers.name } : null,
      required_tier_slug: p.subscription_tiers?.slug ?? 'free',
    }));

    return { topPets, trendingPosts };
  } catch (error) {
    console.error('Error fetching landing data:', error);
    return {
      topPets: [],
      trendingPosts: [],
    };
  }
}

export default async function LandingPage() {
  const { topPets, trendingPosts } = await getLandingData();

  return (
    <OnlyPawsShell active="landing">
      <LandingClient topPets={topPets} trendingPosts={trendingPosts} />
    </OnlyPawsShell>
  );
}