// src/app/cms/layout.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import CmsAppLayout from '@/layouts/CmsAppLayout';

// CMS layout používá getAuth() - musí být force-dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');

  return <CmsAppLayout user={auth.user}>{children}</CmsAppLayout>;
}