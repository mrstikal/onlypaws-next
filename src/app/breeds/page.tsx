import type { Metadata } from 'next';
import OnlyPawsShell from '@/components/onlypaws/OnlyPawsShell';
import BreedsIndexClient from './ui/BreedsIndexClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Plemena | OnlyPaws',
};

export default async function BreedsPage() {

  return (
    <OnlyPawsShell active="breeds">
      <BreedsIndexClient />
    </OnlyPawsShell>
  );
}