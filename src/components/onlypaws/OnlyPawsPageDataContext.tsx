'use client';

import React, { createContext, useContext } from 'react';
import type { SubscriptionTier, TierSlug } from '@/components/onlypaws/UpgradeModal';

type OnlyPawsPageData = {
  tiers: SubscriptionTier[];
  viewerTierSlug: TierSlug;
  isAuthed: boolean;
};

const OnlyPawsPageDataContext = createContext<OnlyPawsPageData | null>(null);

export function OnlyPawsPageDataProvider({
                                           value,
                                           children,
                                         }: {
  value: OnlyPawsPageData;
  children: React.ReactNode;
}) {
  return <OnlyPawsPageDataContext.Provider value={value}>{children}</OnlyPawsPageDataContext.Provider>;
}

export function useOnlyPawsPageDataOptional() {
  return useContext(OnlyPawsPageDataContext);
}

export function useOnlyPawsPageData() {
  const v = useOnlyPawsPageDataOptional();
  if (!v) throw new Error('useOnlyPawsPageData must be used within OnlyPawsPageDataProvider');
  return v;
}