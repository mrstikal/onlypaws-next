'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo } from 'react';
import PostCard from '@/components/onlypaws/PostCard';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { useUpgrade } from '@/components/onlypaws/UpgradeContext';
import { useOnlyPawsPageData } from '@/components/onlypaws/OnlyPawsPageDataContext';
import { formatFollowersCS, formatPostsCS } from '@/utils/pluralize';
import type { TierSlug } from '@/components/onlypaws/UpgradeModal';

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

type Props = {
  topPets: TopPet[];
  trendingPosts: PostCardModel[];
};

export default function LandingClient({ topPets, trendingPosts }: Props) {
  const upgrade = useUpgrade();
  const { tiers, viewerTierSlug, isAuthed } = useOnlyPawsPageData();

  const openUpgrade = () => upgrade?.openUpgrade?.();

  const tiersSorted = useMemo(() => {
    const order: Record<TierSlug, number> = { free: 0, basic: 1, vip: 2, ultra: 3 };
    return [...tiers].sort((a, b) => order[a.slug] - order[b.slug]);
  }, [tiers]);

  return (
    <main>
      <section className="op-container py-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">
              Jedno předplatné.<br />Premium posty napříč celým OnlyPaws.
            </h1>
            <p className="mt-4 text-lg leading-tight text-gray-700">
              Tech demo: navýšení tarifu odemkne premium obsah od všech Mazlíčků. Platby jsou samozřejmě jen na oko.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/feed"
                className="rounded-md bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Zobrazit příspěvky
              </Link>
              <a
                href="#pricing"
                className="rounded-md border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Zobrazit tarify
              </a>
            </div>
          </div>

          <div className="op-card p-6">
            <div className="text-sm font-semibold text-gray-900">Aktuálně:</div>
            <p className="mt-1 text-sm text-gray-600">Premium karty se zamknou/odemknou podle tarifu.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {trendingPosts.slice(0, 4).map((p) => (
                <PostCard key={String(p.id)} post={p} onUpgradeClick={openUpgrade} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="op-container py-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Tarify</h2>
            <p className="mt-1 text-sm text-gray-600">Demo režim: změna tarifu je simulovaná.</p>
          </div>
          <div className="text-sm font-semibold text-gray-900">Vyber tarif a odemkni Premium obsah</div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {tiersSorted.map((t) => {
            const isCurrentTier = isAuthed && t.slug === viewerTierSlug;

            return (
              <div
                key={String(t.id)}
                className={`op-card p-4 ${isCurrentTier ? 'ring-2 ring-rose-800 bg-rose-50/40' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-900">{t.name}</div>

                    {isCurrentTier ? (
                      <span className="rounded-full bg-rose-800 px-2 py-0.5 text-xs font-semibold text-white">
                        Tvůj tarif
                      </span>
                    ) : null}
                  </div>

                  <div className="text-sm text-gray-700">
                    {t.price_monthly === 0 ? 'Zdarma' : `${t.price_monthly} granulí / měs.`}
                  </div>
                </div>

                <p className="mt-3 text-sm text-gray-600">{t.description ?? '—'}</p>

                <div className="mt-4">
                  <PrimaryButton onClick={openUpgrade}>{isCurrentTier ? 'Aktivní' : 'Zvolit (demo)'}</PrimaryButton>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="top-pets" className="op-container py-8">
        <h2 className="text-2xl font-extrabold tracking-tight">Top Mazlíčci</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topPets.map((p) => (
            <div key={p.id} className="op-card p-4">
              <Link href={`/pets/${p.id}/${p.slug}`} className="text-sm font-semibold text-gray-900 hover:underline">
                {p.profile_picture ? (
                  <Image src={p.profile_picture} alt={p.name} className="mx-auto h-20 w-20 rounded-full object-cover" width={80} height={80} loading="lazy" />
                ) : (
                  <div className="mx-auto h-20 w-20 rounded-full bg-gray-200" />
                )}

                <div className="mt-4 text-center text-sm font-semibold text-gray-900">{p.name}</div>
                <div className="mt-1 text-center text-xs text-gray-600">
                  {formatFollowersCS(p.followers_count)} · {formatPostsCS(p.posts_count)}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section id="trending" className="op-container py-8">
        <h2 className="text-2xl font-extrabold tracking-tight">Právě frčí</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trendingPosts.map((p) => (
            <PostCard key={String(p.id)} post={p} onUpgradeClick={openUpgrade} />
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white">
        <div className="op-container py-10 text-sm text-gray-600">
          <div className="font-semibold text-gray-900">OnlyPaws</div>
          <div className="mt-2">Tech demo. Platby jsou simulované. Obsah je testovací.</div>
        </div>
      </footer>
    </main>
  );
}