// src/components/cms/DeleteUserInlineButton.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

type Props = {
  userId: string;
  className?: string;
};

export default function DeleteUserInlineButton({ userId, className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const baseClassName =
    'rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60'

  async function onDelete() {
    const ok = window.confirm('Opravdu smazat uživatele? (Smažou se i navázaná data podle DB relací)');
    if (!ok) return;

    setLoading(true);
    const res = await fetch(`/api/cms/users/${userId}`, { method: 'DELETE' });
    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      window.alert((data && typeof data.error === 'string' && data.error) || 'Nepodařilo se smazat uživatele');
      return;
    }

    router.push(ROUTES.CMS.ADMIN.USERS);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      className={`${baseClassName} ${className ?? ''}`.trim()}
    >
      Smazat
    </button>
  );
}