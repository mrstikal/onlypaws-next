import type { Metadata } from 'next';
import OnlyPawsShell from '@/components/onlypaws/OnlyPawsShell';
import PetShowClient from './ui/PetShowClient';

// User-specific data (liked_by_me, followed_by_me, can_like, can_follow, is_owner) - bez cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Mazlíček | OnlyPaws',
};

export default async function PetShowPage({
                                            params,
                                          }: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id } = await params;

  return (
    <OnlyPawsShell active="pets">
      <PetShowClient petId={id} />
    </OnlyPawsShell>
  );
}