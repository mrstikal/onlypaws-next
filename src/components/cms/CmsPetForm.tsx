// src/components/cms/CmsPetForm.tsx
'use client';

import Image from 'next/image';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { publicUrl } from '@/utils/mediaUrl';
import { ROUTES } from '@/constants/routes';

type BreedOpt = { id: string; name: string; species: string };

export default function CmsPetForm(props: {
  mode: 'create' | 'edit';
  petId?: string;
  breeds: BreedOpt[];
  initial?: {
    name: string;
    bio: string;
    age_years: number | null;
    age_months: number | null;
    breed_id: string | null;
    profile_picture: string | null;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState(props.initial?.name ?? '');
  const [bio, setBio] = useState(props.initial?.bio ?? '');
  const [ageYears, setAgeYears] = useState<string>(props.initial?.age_years == null ? '' : String(props.initial.age_years));
  const [ageMonths, setAgeMonths] = useState<string>(props.initial?.age_months == null ? '' : String(props.initial.age_months));
  const [breedId, setBreedId] = useState<string>(props.initial?.breed_id ?? '');
  const [avatarFileName, setAvatarFileName] = useState<string>(props.initial?.profile_picture ?? '');
  const [uploading, setUploading] = useState(false);

  const avatarUrl = useMemo(() => publicUrl('pets', avatarFileName) ?? '', [avatarFileName]);

  const uploadAvatar = async (file: File) => {
    setErr(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);

      const res = await fetch('/api/cms/uploads/pets', { method: 'POST', body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Upload se nepovedl (${res.status})`);
      }

      const j = (await res.json()) as { fileName: string };
      setAvatarFileName(String(j.fileName ?? ''));
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      className="p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);

        const nm = name.trim();
        if (!nm) return setErr('Jméno je povinné.');

        const payload = {
          name: nm,
          bio: bio.trim() ? bio.trim() : null,
          age_years: ageYears === '' ? null : Number(ageYears),
          age_months: ageMonths === '' ? null : Number(ageMonths),
          breed_id: breedId ? breedId : null,
          profile_picture: avatarFileName ? avatarFileName : null,
        };

        setBusy(true);
        try {
          const res =
            props.mode === 'create'
              ? await fetch('/api/cms/pets', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
              })
              : await fetch(`/api/cms/pets/${props.petId}`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
              });

          if (!res.ok) {
            const j = await res.json().catch(() => null);
            throw new Error(j?.error ?? `Uložení se nepovedlo (${res.status})`);
          }

          const j = await res.json().catch(() => null);
          const id = props.mode === 'create' ? String(j?.id ?? '') : String(props.petId ?? '');
          router.push(id ? ROUTES.CMS.pet(id) : ROUTES.CMS.PETS);
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
          <div className="text-lg font-semibold">{props.mode === 'create' ? 'Vytvořit mazlíčka' : 'Upravit mazlíčka'}</div>
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
        <div className="md:col-span-2 rounded-md border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Avatar</div>
              <div className="mt-1 text-sm text-gray-700">{avatarFileName ? `` : 'Zatím není nahráno'}</div>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800">
              {uploading ? 'Nahrávám…' : 'Nahrát obrázek'}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  uploadAvatar(f).catch((er) => setErr(String(er?.message ?? er)));
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>

          {avatarUrl ? (
            <div className="mt-3 flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-white">
                <Image src={avatarUrl} alt="" className="h-full w-full object-cover" width={80} height={80} />
              </div>
            </div>
          ) : null}
        </div>

        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-gray-600">Jméno</div>
          <input className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Věk (roky)</div>
          <input className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" value={ageYears} onChange={(e) => setAgeYears(e.target.value)} inputMode="numeric" />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Věk (měsíce)</div>
          <input className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} inputMode="numeric" />
        </label>

        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-gray-600">Plemeno</div>
          <select className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" value={breedId} onChange={(e) => setBreedId(e.target.value)}>
            <option value="">—</option>
            {props.breeds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.species})
              </option>
            ))}
          </select>
        </label>

        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-gray-600">Bio</div>
          <textarea className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
      </div>
    </form>
  );
}