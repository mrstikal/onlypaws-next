import React from 'react';
import { prisma } from '@/lib/prisma';
import OnlyPawsAppLayout from '@/layouts/OnlyPawsAppLayout';
import type { SubscriptionTier, TierSlug } from '@/components/onlypaws/UpgradeModal';
import { getAuth } from '@/lib/auth';
import { OnlyPawsPageDataProvider } from '@/components/onlypaws/OnlyPawsPageDataContext';

function toTierSlug(value: string): TierSlug {
  if (value === 'free' || value === 'basic' || value === 'vip' || value === 'ultra') return value;
  return 'free';
}

type Active = 'landing' | 'feed' | 'breeds' | 'pets' | 'dashboard';

type Props = {
  active?: Active;
  children: React.ReactNode;
};

export default async function OnlyPawsShell({ active, children }: Props) {
  const auth = await getAuth();

  const tiersRaw = await prisma.subscription_tiers.findMany({
    select: { id: true, name: true, slug: true, price_monthly: true, description: true },
    orderBy: { price_monthly: 'asc' },
  });

  const tiers: SubscriptionTier[] = tiersRaw.map((t) => ({
    id: t.id.toString(),
    name: t.name,
    slug: toTierSlug(t.slug),
    price_monthly: t.price_monthly,
    description: t.description ?? null,
  }));

  let viewerTierSlug: TierSlug = 'free';

  if (auth.isAuthed) {
    const sub = await prisma.subscriptions.findUnique({
      where: { user_id: BigInt(auth.user.id) },
      select: { subscription_tier: { select: { slug: true } } },
    });

    const slug = sub?.subscription_tier?.slug;
    if (slug) viewerTierSlug = toTierSlug(slug);
  }

  return (
    <OnlyPawsAppLayout
      active={active}
      tiers={tiers}
      viewerTierSlug={viewerTierSlug}
      isAuthed={auth.isAuthed}
      user={auth.user}
    >
      <OnlyPawsPageDataProvider value={{ tiers, viewerTierSlug, isAuthed: auth.isAuthed }}>
        {children}
      </OnlyPawsPageDataProvider>
    </OnlyPawsAppLayout>
  );
}