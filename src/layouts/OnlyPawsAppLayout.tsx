'use client';

import React, { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import TopNav from '@/components/onlypaws/TopNav';
import UpgradeModal, { type SubscriptionTier, type TierSlug } from '@/components/onlypaws/UpgradeModal';
import { UpgradeProvider } from '@/components/onlypaws/UpgradeContext';
import { AuthModalProvider } from '@/components/onlypaws/AuthModalContext';
import AuthModals from '@/components/onlypaws/AuthModals';

type Active = 'landing' | 'feed' | 'breeds' | 'pets' | 'dashboard';

type Props = {
  active?: Active;
  tiers?: SubscriptionTier[];
  viewerTierSlug?: TierSlug;
  isAuthed?: boolean;
  user?: { name?: string | null; email?: string | null } | null;
  children: React.ReactNode | ((api: { openUpgrade: () => void }) => React.ReactNode);
};

export default function OnlyPawsAppLayout({
  active,
  tiers,
  viewerTierSlug,
  isAuthed = false,
  user = null,
  children,
}: Props) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const resolvedActive: Active =
    active ??
    (pathname.startsWith('/dashboard')
      ? 'dashboard'
      : pathname.startsWith('/breeds')
        ? 'breeds'
        : pathname.startsWith('/pets') || pathname.startsWith('/pet/')
          ? 'pets'
          : pathname.startsWith('/feed')
            ? 'feed'
            : 'landing');

  const resolvedVariant = resolvedActive === 'landing' ? 'landing' : 'app';

  const resolvedTiers = useMemo(() => tiers ?? [], [tiers]);
  const resolvedViewerTierSlug = (viewerTierSlug ?? 'free') as TierSlug;

  const openUpgrade = () => setUpgradeOpen(true);
  const openLogin = () => setLoginOpen(true);
  const openRegister = () => setRegisterOpen(true);

  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      <AuthModalProvider openLogin={openLogin} openRegister={openRegister}>
        <TopNav
          variant={resolvedVariant}
          active={resolvedActive}
          viewerTierSlug={resolvedViewerTierSlug}
          tiers={resolvedTiers.map((t) => ({ slug: t.slug, name: t.name }))}
          isAuthed={isAuthed}
          user={user}
          onUpgradeClick={openUpgrade}
          onLogoutClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.refresh();
          }}
        />

        <UpgradeProvider openUpgrade={openUpgrade}>
          {typeof children === 'function' ? children({ openUpgrade }) : children}
        </UpgradeProvider>

        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          tiers={resolvedTiers}
          viewerTierSlug={resolvedViewerTierSlug}
          isAuthed={isAuthed}
          onRequireAuth={() => setLoginOpen(true)}
          onChooseTier={async (tierSlug) => {
            const res = await fetch('/api/subscription', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ tierSlug }),
            });

            if (!res.ok) {
              console.error('choose tier failed', res.status);
              return;
            }

            router.refresh();
          }}
        />

        <AuthModals
          loginOpen={loginOpen}
          registerOpen={registerOpen}
          onCloseLogin={() => {
            setLoginOpen(false);
            router.refresh();
          }}
          onCloseRegister={() => {
            setRegisterOpen(false);
            router.refresh();
          }}
          onOpenLogin={() => setLoginOpen(true)}
          onOpenRegister={() => setRegisterOpen(true)}
        />
      </AuthModalProvider>
    </div>
  );
}