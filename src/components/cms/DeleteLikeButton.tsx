// src/components/cms/DeleteLikeButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteLikeButton({ likeId, onDeletedHref }: { likeId: string; onDeletedHref?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        className="text-red-700 hover:bg-red-50 disabled:opacity-60 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold"
        disabled={busy}
        onClick={async () => {
          setErr(null);
          setBusy(true);
          try {
            const res = await fetch(`/api/cms/likes/${likeId}`, { method: 'DELETE' });
            if (!res.ok) {
              const j = await res.json().catch(() => null);
              throw new Error(j?.error ?? `Smazání se nepovedlo (${res.status})`);
            }

            if (onDeletedHref) router.push(onDeletedHref);
            router.refresh();
          } catch (e) {
            setErr(String(e instanceof Error ? e.message : e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Mažu…' : 'Smazat'}
      </button>

      {err ? <div className="text-sm text-red-700">{err}</div> : null}
    </div>
  );
}