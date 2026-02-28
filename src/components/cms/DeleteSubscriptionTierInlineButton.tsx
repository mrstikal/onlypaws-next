// src/components/cms/DeleteSubscriptionTierInlineButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  tierId: string;
  className?: string;
};

export default function DeleteSubscriptionTierInlineButton({ tierId, className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const baseClassName =
    'rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60';

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        className={`${baseClassName} ${className ?? ''}`.trim()}
        disabled={busy}
        onClick={async () => {
          if (!confirm('Opravdu smazat tento tier?')) return;

          setErr(null);
          setBusy(true);
          try {
            const res = await fetch(`/api/cms/subscription-tiers/${tierId}`, { method: 'DELETE' });
            if (!res.ok) {
              const j = await res.json().catch(() => null);
              throw new Error(j?.error ?? `Smazání se nepovedlo (${res.status})`);
            }
            router.refresh();
          } catch (e) {
            setErr(String(e instanceof Error ? e.message : e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? '…' : 'Smazat'}
      </button>

      {err ? <div className="text-xs text-red-700">{err}</div> : null}
    </div>
  );
}