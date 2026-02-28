// src/components/cms/CmsCommentEditForm.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

export default function CmsCommentEditForm({ commentId, initialBody }: { commentId: string; initialBody: string }) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="mt-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);

        const text = body.trim();
        if (!text) return setErr('Text je povinný.');
        if (text.length > 1000) return setErr('Text je příliš dlouhý.');

        setBusy(true);
        try {
          const res = await fetch(`/api/cms/comments/${commentId}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ body: text }),
          });

          if (!res.ok) {
            const j = await res.json().catch(() => null);
            throw new Error(j?.error ?? `Uložení se nepovedlo (${res.status})`);
          }

          router.push(ROUTES.CMS.comment(commentId));
          router.refresh();
        } catch (e2) {
          setErr(String(e2 instanceof Error ? e2.message : e2));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          {err ? <div className="text-sm text-red-700">{err}</div> : null}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {busy ? 'Ukládám…' : 'Uložit'}
        </button>
      </div>

      <label className="mt-4 block">
        <div className="text-xs font-semibold text-gray-600">Text</div>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
          rows={8}
          maxLength={1000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>

      <div className="mt-2 text-xs text-gray-600">{body.trim().length}/1000</div>
    </form>
  );
}