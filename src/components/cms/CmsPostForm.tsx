// src/components/cms/CmsPostForm.tsx
'use client';

import Image from 'next/image';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { publicUrl } from '@/utils/mediaUrl';
import { ROUTES } from '@/constants/routes';

type Tier = { id: string; name: string; slug: string };
type PetOpt = { id: string; name: string };

export default function CmsPostForm(props: {
  mode: 'create' | 'edit';
  postId?: string;
  pets: PetOpt[];
  tiers: Tier[];
  initial?: {
    pet_id: string;
    caption: string;
    is_premium: boolean;
    subscription_tier_id: string | null;
    media_type: string;
    media_url: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [petId, setPetId] = useState(props.initial?.pet_id ?? (props.pets[0]?.id ?? ''));
  const [caption, setCaption] = useState(props.initial?.caption ?? '');
  const [isPremium, setIsPremium] = useState(Boolean(props.initial?.is_premium));
  const [tierId, setTierId] = useState<string>(props.initial?.subscription_tier_id ?? '');
  const [mediaFileName, setMediaFileName] = useState<string>(props.initial?.media_url ?? '');
  const [uploading, setUploading] = useState(false);

  const selectedTierOk = useMemo(() => !isPremium || Boolean(tierId), [isPremium, tierId]);

  const mediaPublicUrl = useMemo(() => {
    return publicUrl('posts', mediaFileName) ?? '';
  }, [mediaFileName]);

  const uploadMedia = async (file: File) => {
    setErr(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);

      const res = await fetch('/api/cms/uploads/posts', {method: 'POST', body: form});
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Upload se nepovedl (${res.status})`);
      }

      const j = (await res.json()) as { fileName: string; mediaType: string };
      setMediaFileName(String(j.fileName ?? ''));
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

        if (!petId) return setErr('Vyberte mazlíčka.');
        if (!selectedTierOk) return setErr('Vyberte tier pro premium.');

        if (!mediaFileName) return setErr('Nahrajte soubor.');

        setBusy(true);
        try {
          const payload = {
            pet_id: petId,
            caption: caption.trim() ? caption : null,
            is_premium: isPremium,
            subscription_tier_id: isPremium ? (tierId || null) : null,
            media_type: 'image',
            media_url: mediaFileName,
          };

          const res =
            props.mode === 'create'
              ? await fetch('/api/cms/posts', {
                method: 'POST',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify(payload),
              })
              : await fetch(`/api/cms/posts/${props.postId}`, {
                method: 'PATCH',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify(payload),
              });

          if (!res.ok) {
            const j = await res.json().catch(() => null);
            throw new Error(j?.error ?? `Uložení se nepovedlo (${res.status})`);
          }

          const j = await res.json().catch(() => null);
          const id = props.mode === 'create' ? String(j?.id ?? '') : String(props.postId ?? '');
          router.push(id ? ROUTES.CMS.post(id) : ROUTES.CMS.POSTS);
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
          <div className="text-lg font-semibold">{props.mode === 'create' ? 'Vytvořit post' : 'Upravit post'}</div>
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
        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Mazlíček</div>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            value={petId}
            onChange={(e) => setPetId(e.target.value)}
          >
            {props.pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (#{p.id})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Premium</div>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            value={isPremium ? '1' : '0'}
            onChange={(e) => setIsPremium(e.target.value === '1')}
          >
            <option value="0">Ne</option>
            <option value="1">Ano</option>
          </select>
        </label>

        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-gray-600">Caption</div>
          <textarea
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            rows={4}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>

        {isPremium ? (
          <label className="block md:col-span-2">
            <div className="text-xs font-semibold text-gray-600">Předplatné</div>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
              value={tierId}
              onChange={(e) => setTierId(e.target.value)}
            >
              <option value="">— vyberte —</option>
              {props.tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="md:col-span-2 rounded-md border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Média</div>
              <div className="mt-1 text-sm text-gray-700">
                {mediaFileName ? `` : 'Zatím není nahráno'}
              </div>
            </div>

            <label
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800">
              {uploading ? 'Nahrávám…' : 'Nahrát obrázek'}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  uploadMedia(f).catch((err) => setErr(String(err?.message ?? err)));
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>

          {mediaPublicUrl ? (
            <div className="mt-3 overflow-hidden rounded-md border border-gray-200 bg-white">
              <Image src={mediaPublicUrl} alt="" className="max-h-105 w-full object-contain" width={400} height={400} />
            </div>
          ) : null}
        </div>
      </div>
    </form>
  );
}