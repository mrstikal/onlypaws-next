// src/app/cms/profile/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CmsProfileForm from '@/components/cms/CmsProfileForm';
import CmsPasswordChangeForm from '@/components/cms/CmsPasswordChangeForm';

// User-specific admin page - vždy fresh data bez cache
export const revalidate = false;

export default async function CmsProfilePage() {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');

  let u;
  try {
    u = await prisma.users.findUnique({
      where: { id: BigInt(auth.user.id) },
      select: {
        subscriptions: {
          select: {
            subscription_tier: { select: { name: true } },
            ends_at: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    redirect('/');
  }

  const tierName = u?.subscriptions?.subscription_tier?.name ?? 'Free';

  return (
    <main className="p-6">
      <div>
        <h1 className="text-lg font-semibold">Profil</h1>
        <p className="mt-1 text-sm text-gray-600">Váš účet</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-200 bg-white">
            <tr>
              <td className="w-56 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Name</td>
              <td className="px-3 py-2">{auth.user.name}</td>
            </tr>
            <tr>
              <td className="bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Email</td>
              <td className="px-3 py-2">{auth.user.email}</td>
            </tr>
            <tr>
              <td className="bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Předplatné</td>
              <td className="px-3 py-2">{tierName}</td>
            </tr>
            <tr>
              <td className="bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Role</td>
              <td className="px-3 py-2">{auth.user.role}</td>
            </tr>
            <tr>
              <td className="bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">User ID</td>
              <td className="px-3 py-2">{auth.user.id}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <CmsProfileForm initialName={auth.user.name} />
      <CmsPasswordChangeForm />
    </main>
  );
}