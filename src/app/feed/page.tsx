import type { Metadata } from 'next';
import OnlyPawsShell from '@/components/onlypaws/OnlyPawsShell';
import FeedIndexClient from './ui/FeedIndexClient';

// User-specific data - bez cache
// Každý uživatel vidí jiný obsah na základě followů a preferencí
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Přehled | OnlyPaws',
};

export default async function FeedPage() {
  return (
    <OnlyPawsShell active="feed">
      <FeedIndexClient />
    </OnlyPawsShell>
  );
}