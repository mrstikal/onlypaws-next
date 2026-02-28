// src/components/cms/CmsProfileForm.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function CmsProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOkMsg(null);

    const res = await fetch('/api/cms/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError((data && typeof data.error === 'string' && data.error) || 'Nepodařilo se uložit změny');
      return;
    }

    setOkMsg('Profil aktualizován.');
    router.refresh(); // So the name updates in the layout (taken from getAuth)
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-md border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">Upravit profil</h2>

      <label className="mt-3 block">
        <div className="text-xs font-semibold text-gray-600">Jméno</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
          disabled={loading}
          maxLength={255}
          autoComplete="name"
        />
      </label>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          Uložit
        </button>

        {error ? <div className="text-sm font-semibold text-red-700">{error}</div> : null}
        {okMsg ? <div className="text-sm font-semibold text-green-700">{okMsg}</div> : null}
      </div>
    </form>
  );
}