'use client';

import Modal from '@/components/ui/Modal';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';
import { useMemo } from 'react';

export type TierSlug = 'free' | 'basic' | 'vip' | 'ultra';

export type SubscriptionTier = {
  id: string | number | bigint;
  name: string;
  slug: TierSlug;
  price_monthly: number;
  description: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  tiers: SubscriptionTier[];
  viewerTierSlug: TierSlug;

  isAuthed?: boolean;
  onRequireAuth?: () => void;
  onChooseTier?: (tierSlug: TierSlug) => Promise<void> | void;
};

export default function UpgradeModal({
                                       open,
                                       onClose,
                                       tiers,
                                       viewerTierSlug,
                                       isAuthed = false,
                                       onRequireAuth,
                                       onChooseTier,
                                     }: Props) {
  const sortedTiers = useMemo(() => {
    const order: Record<TierSlug, number> = { free: 0, basic: 1, vip: 2, ultra: 3 };
    return [...tiers].sort((a, b) => order[a.slug] - order[b.slug]);
  }, [tiers]);

  const chooseTier = async (tierSlug: TierSlug) => {
    if (!isAuthed) {
      onClose();
      onRequireAuth?.();
      return;
    }

    await onChooseTier?.(tierSlug);
    onClose();
  };

  return (
    <Modal show={open} onClose={onClose} maxWidth="2xl">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Změnit tarif (demo)</h2>
            <p className="mt-1 text-sm text-gray-600">
              Platby jsou simulované. Změna tarifu okamžitě odemkne odpovídající premium příspěvky napříč aplikací.
            </p>
          </div>
          <SecondaryButton onClick={onClose}>Zavřít</SecondaryButton>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {sortedTiers.map((t) => {
            const active = t.slug === viewerTierSlug;
            const key = typeof t.id === 'bigint' ? t.id.toString() : String(t.id);

            return (
              <div
                key={key}
                className={[
                  'rounded-lg border p-4 text-left transition',
                  active ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-white',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-gray-900">{t.name}</div>
                  <div className="text-sm text-gray-700">
                    {t.price_monthly === 0 ? 'Zdarma' : `${t.price_monthly} granulí / měs.`}
                  </div>
                </div>

                {t.description ? (
                  <div className="mt-2 text-sm text-gray-600">{t.description}</div>
                ) : null}

                <div className="mt-4">
                  <PrimaryButton onClick={() => chooseTier(t.slug)} disabled={active}>
                    {active ? 'Aktuální tarif' : 'Zvolit'}
                  </PrimaryButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}