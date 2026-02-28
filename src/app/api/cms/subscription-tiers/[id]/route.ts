// src/app/api/cms/subscription-tiers/[id]/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { cmsJsonError } from '@/lib/server/cms/http';
import { deleteCmsSubscriptionTier, updateCmsSubscriptionTier } from '@/lib/server/cms/subscription-tiers/commands';

export const runtime = 'nodejs';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    await updateCmsSubscriptionTier(auth.user, id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cmsJsonError(error);
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });

  try {
    const { id } = await ctx.params;
    await deleteCmsSubscriptionTier(auth.user, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cmsJsonError(error);
  }
}