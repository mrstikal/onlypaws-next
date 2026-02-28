// src/components/cms/CmsUserRoleForm.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

type AllowedRole = 'user' | 'admin' | 'superadmin';

export default function CmsUserRoleForm({ userId, initialRole }: { userId: string; initialRole: string }) {
  const router = useRouter();
  const [role, setRole] = React.useState<AllowedRole>(
    initialRole === 'admin' || initialRole === 'superadmin' ? initialRole : 'user',
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/cms/users/${userId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role }),
    });

    const data = await res.json().catch(() => null);

    setLoading(false);

    if (!res.ok) {
      setError((data && typeof data.error === 'string' && data.error) || 'Nepodařilo se uložit změny');
      return;
    }

    router.refresh();
    router.push(ROUTES.CMS.ADMIN.user(userId));
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-[240px_1fr]">
      <label className="block">
        <div className="text-xs font-semibold text-gray-600">Role</div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as AllowedRole)}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
          disabled={loading}
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
          <option value="superadmin">superadmin</option>
        </select>
      </label>

      <div className="flex items-end gap-3">
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          disabled={loading}
        >
          Uložit
        </button>

        {error ? <div className="text-sm font-semibold text-red-700">{error}</div> : null}
      </div>
    </form>
  );
}