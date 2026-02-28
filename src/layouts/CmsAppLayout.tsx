// src/layouts/CmsAppLayout.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import type { AuthUser } from '@/lib/authTypes';
import { isStaff } from '@/lib/cmsAuthz';
import { isSuperadminRole } from '@/lib/server/roles';
import { ROUTES } from '@/constants/routes';

export default function CmsAppLayout({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  const staff = isStaff(user);

  return (
    <div className="min-h-dvh bg-gray-100 text-gray-900">
      <div className="mx-auto max-w-500 px-4 py-4">
        <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm">
          <div className="text-sm font-semibold">OnlyPaws CMS</div>
          <div className="text-xs text-gray-600">
            {user.name} · {staff ? 'staff' : 'user'}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
          <aside className="rounded-lg bg-white p-3 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Moje</div>
            <nav className="mt-2 space-y-1 text-sm">
              <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.PROFILE}>
                Profil
              </Link>

              {!staff && (
                <>
                  <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.PETS}>
                    Mazlíčci
                  </Link>
                  <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.POSTS}>
                    Příspěvky
                  </Link>
                  <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.COMMENTS}>
                    Komentáře
                  </Link>
                  <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.LIKES}>
                    Lajky
                  </Link>
                  <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.FOLLOWS}>
                    Sledování
                  </Link>
                </>
              )}
            </nav>

            {staff && (
              <>
                <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Administrace</div>
                <nav className="mt-2 space-y-1 text-sm">
                  <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.ADMIN.PETS}>
                    Mazlíčci
                  </Link>
                  <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.ADMIN.POSTS}>
                    Příspěvky
                  </Link>
                  <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.ADMIN.COMMENTS}>
                    Komentáře
                  </Link>
                  <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.ADMIN.LIKES}>
                    Lajky
                  </Link>
                  <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.ADMIN.FOLLOWS}>
                    Sledování
                  </Link>
                  <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.ADMIN.BREEDS}>
                    Plemena
                  </Link>

                  {isSuperadminRole(user.role) && (
                    <>
                      <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.ADMIN.USERS}>
                        Uživatelé
                      </Link>
                      <Link className="block rounded-md px-2 py-1 hover:bg-gray-50" href={ROUTES.CMS.ADMIN.SUBSCRIPTION_TIERS}>
                        Správa předplatných
                      </Link>
                    </>
                  )}
                </nav>
              </>
            )}
          </aside>

          <section className="rounded-lg bg-white shadow-sm">{children}</section>
        </div>
      </div>
    </div>
  );
}