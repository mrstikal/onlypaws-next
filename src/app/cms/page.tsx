// src/app/cms/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';

// Admin pages - vždy fresh data bez cache
export const revalidate = false;

export default async function CmsHomePage() {
  // Chránit admin stránku
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');

  return (
    <main className="px-6 py-6">
      <h1 className="text-xl font-semibold">CMS</h1>
      <p className="mt-2 text-sm text-gray-600">Vyberte sekci v menu.</p>
    </main>
  );
}