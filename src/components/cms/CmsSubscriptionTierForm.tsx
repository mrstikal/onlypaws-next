// src/components/cms/CmsSubscriptionTierForm.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import DeleteSubscriptionTierInlineButton from "@/components/cms/DeleteSubscriptionTierInlineButton";
import { ROUTES } from '@/constants/routes';

export default function CmsSubscriptionTierForm(props: {
  mode: 'create' | 'edit';
  tierId?: string;
  initial?: { name: string; slug: string; price_monthly: number; description: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState(props.initial?.name ?? '');
  const [slug, setSlug] = useState(props.initial?.slug ?? '');
  const [price, setPrice] = useState(String(props.initial?.price_monthly ?? 0));
  const [description, setDescription] = useState(props.initial?.description ?? '');

  return (
    <form
      className="p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);

        const nm = name.trim();
        if (!nm) return setErr('Název je povinný.');

        const sl = slug.trim().toLowerCase();
        if (!/^[a-z0-9-]+$/.test(sl)) return setErr('Slug může obsahovat jen a-z, 0-9 a pomlčky.');

        const pr = Number(price);
        if (!Number.isFinite(pr) || pr < 0) return setErr('Cena musí být číslo >= 0.');

        setBusy(true);
        try {
          const payload = {
            name: nm,
            slug: sl,
            price_monthly: Math.trunc(pr),
            description: description.trim() ? description.trim() : null,
          };

          const res =
            props.mode === 'create'
              ? await fetch('/api/cms/subscription-tiers', {
                method: 'POST',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify(payload),
              })
              : await fetch(`/api/cms/subscription-tiers/${props.tierId}`, {
                method: 'PATCH',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify(payload),
              });

          if (!res.ok) {
            const j = await res.json().catch(() => null);
            throw new Error(j?.error ?? `Uložení se nepovedlo (${res.status})`);
          }

          const j = await res.json().catch(() => null);
          const id = props.mode === 'create' ? String(j?.id ?? '') : String(props.tierId ?? '');
          router.push(id ? ROUTES.CMS.ADMIN.subscriptionTier(id) : ROUTES.CMS.ADMIN.SUBSCRIPTION_TIERS);
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
          <div
            className="text-lg font-semibold">{props.mode === 'create' ? 'Vytvořit předplatné' : 'Upravit předplatné'}</div>
          {err ? <div className="mt-2 text-sm text-red-700">{err}</div> : null}
        </div>

        <div className="flex items-center gap-2">

          <button
            type="submit"
            disabled={busy}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            {busy ? 'Ukládám…' : 'Uložit'}
          </button>

          <DeleteSubscriptionTierInlineButton
            tierId={String(props.tierId)}
            className="px-3 py-1.5 text-sm! font-semibold"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-gray-600">Název</div>
          <input className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" value={name}
                 onChange={(e) => setName(e.target.value)}/>
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Slug</div>
          <input className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" value={slug}
                 onChange={(e) => setSlug(e.target.value)}/>
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Cena / měs.</div>
          <input className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" value={price}
                 onChange={(e) => setPrice(e.target.value)} inputMode="numeric"/>
        </label>

        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-gray-600">Popis</div>
          <textarea className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm" rows={6}
                    value={description} onChange={(e) => setDescription(e.target.value)}/>
        </label>
      </div>
    </form>
  );
}