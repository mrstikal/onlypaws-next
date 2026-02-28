// src/app/cms/admin/subscription-tiers/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { formatDateTimeCS } from '@/utils/datetime';
import { ROUTES } from '@/constants/routes';
import { parseBigIntParam } from '@/lib/cms/params';

export default async function CmsSubscriptionTierViewPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (auth.user.role !== 'superadmin') redirect(ROUTES.CMS.ROOT);

  const { id } = await params;
  const tierId = parseBigIntParam(id);
  if (!tierId) notFound();

  const t = await prisma.subscription_tiers.findUnique({
    where: { id: tierId },
    select: { id: true, name: true, slug: true, price_monthly: true, description: true, created_at: true, updated_at: true },
  });
  if (!t) notFound();

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mt-1 text-sm text-gray-600">Předplatné #{t.id.toString()}</h1>
          <p className="text-lg font-semibold">{t.name}</p>
        </div>

        <Link
          href={ROUTES.CMS.ADMIN.subscriptionTierEdit(t.id.toString())}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          Upravit
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Slug</div>
          <div className="mt-1 text-sm">{t.slug}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cena</div>
          <div className="mt-1 text-sm">{t.price_monthly ?? 0}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Popis</div>
          <div className="mt-1 whitespace-pre-wrap text-sm">{t.description ?? '—'}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vytvořeno</div>
          <div className="mt-1 text-sm">{formatDateTimeCS(t.created_at)}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Upraveno</div>
          <div className="mt-1 text-sm">{formatDateTimeCS(t.updated_at)}</div>
        </div>
      </div>
    </main>
  );
}