import type { Metadata } from 'next';
import OnlyPawsAppLayout from '@/layouts/OnlyPawsAppLayout';
import { getAuth } from '@/lib/auth';
import PetShowClient from '@/app/pets/[id]/[slug]/ui/PetShowClient';

// User-specific data (liked_by_me, followed_by_me, can_like, can_follow, is_owner) - bez cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Mazlíček | OnlyPaws',
};

function extractId(idSlug: string): string | null {
  // očekáváme např. "112-kocicichaos" nebo jen "112"
  const m = /^(\d+)(?:-|$)/.exec(idSlug);
  return m?.[1] ?? null;
}

export default async function PetShowLegacyStylePage({
                                                       params,
                                                     }: {
  params: Promise<{ idSlug: string }>;
}) {
  const auth = await getAuth();
  const { idSlug } = await params;

  const id = extractId(idSlug);

  if (!id) {
    // jednoduchý fallback (můžeš později udělat hezkou 404 stránku)
    return (
      <OnlyPawsAppLayout active="pets" isAuthed={auth.isAuthed} user={auth.user}>
        <main className="op-container-narrow py-8">
          <div className="op-card p-6 text-center text-sm text-gray-600">Neplatná URL mazlíčka.</div>
        </main>
      </OnlyPawsAppLayout>
    );
  }

  return (
    <OnlyPawsAppLayout active="pets" isAuthed={auth.isAuthed} user={auth.user}>
      <PetShowClient petId={id} />
    </OnlyPawsAppLayout>
  );
}