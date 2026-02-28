// src/components/cms/DeletePetInlineButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  petId: string;
  className?: string;
};

export default function DeletePetInlineButton({ petId, className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const baseClassName =
    'rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60';

  return (
    <button
      type="button"
      className={`${baseClassName} ${className ?? ''}`.trim()}
      disabled={busy}
      title="Smazat mazlíčka"
      onClick={async () => {
        if (!confirm('Opravdu smazat tohoto mazlíčka?')) return;

        setBusy(true);
        try {
          const res = await fetch(`/api/cms/pets/${petId}`, { method: 'DELETE' });
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