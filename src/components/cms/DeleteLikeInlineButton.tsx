// src/components/cms/DeleteLikeInlineButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteLikeInlineButton({ likeId }: { likeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
      disabled={busy}
      title="Smazat lajk"
      onClick={async () => {
        if (!confirm('Opravdu smazat tento lajk?')) return;

        setBusy(true);
        try {
          const res = await fetch(`/api/cms/likes/${likeId}`, { method: 'DELETE' });
          if (!res.ok) {
            const j = await res.json().catch(() => null);
            throw new Error(j?.error ?? `Smazání se nepovedlo (${res.status})`);
          }
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? '…' : 'Smazat'}
    </button>
  );
}