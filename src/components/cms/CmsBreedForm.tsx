// src/components/cms/CmsBreedForm.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

export default function CmsBreedForm(props: {
  mode: 'create' | 'edit';
  breedId?: string;
  initial?: { name: string; species: 'dog' | 'cat'; api_id: string; description: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState(props.initial?.name ?? '');
  const [species, setSpecies] = useState<'dog' | 'cat'>(props.initial?.species ?? 'dog');
  const [apiId, setApiId] = useState(props.initial?.api_id ?? '');
  const [description, setDescription] = useState(props.initial?.description ?? '');

  return (
    <form
      className="p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);

        const nm = name.trim();
        if (!nm) return setErr('Název je povinný.');

        setBusy(true);
        try {
          const payload = {
            name: nm,
            species,
            api_id: apiId.trim() ? apiId.trim() : null,
            description: description.trim() ? description.trim() : null,
          };

          const res =
            props.mode === 'create'
              ? await fetch('/api/cms/breeds', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
              })
              : await fetch(`/api/cms/breeds/${props.breedId}`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
              });

          if (!res.ok) {
            const j = await res.json().catch(() => null);
            throw new Error(j?.error ?? `Uložení se nepovedlo (${res.status})`);
          }

          const j = await res.json().catch(() => null);
          const id = props.mode === 'create' ? String(j?.id ?? '') : String(props.breedId ?? '');
          router.push(id ? ROUTES.CMS.breed(id) : ROUTES.CMS.BREEDS);
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
          <div className="text-lg font-semibold">{props.mode === 'create' ? 'Vytvořit plemeno' : 'Upravit plemeno'}</div>
          {err ? <div className="mt-2 text-sm text-red-700">{err}</div> : null}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {busy ? 'Ukládám…' : 'Uložit'}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-gray-600">Název</div>
          <input className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Druh</div>
          <select className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" value={species} onChange={(e) => setSpecies(e.target.value as 'dog' | 'cat')}>
            <option value="dog">Pes</option>
            <option value="cat">Kočka</option>
          </select>
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">API ID</div>
          <input className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" value={apiId} onChange={(e) => setApiId(e.target.value)} placeholder="Volitelné" />
        </label>

        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-gray-600">Popis</div>
          <textarea className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>
    </form>
  );
}