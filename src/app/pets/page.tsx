import type { Metadata } from 'next';
import OnlyPawsShell from '@/components/onlypaws/OnlyPawsShell';
import PetsIndexClient from './ui/PetsIndexClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Mazlíčci | OnlyPaws',
};

export default async function PetsPage() {
  return (
    <OnlyPawsShell active="pets">
      <PetsIndexClient />
    </OnlyPawsShell>
  );
}