// src/app/api/cms/subscription-tiers/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { cmsJsonError } from '@/lib/server/cms/http';
import { createCmsSubscriptionTier } from '@/lib/server/cms/subscription-tiers/commands';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const created = await createCmsSubscriptionTier(auth.user, body);
    return NextResponse.json({ ok: true, id: created.id });
  } catch (error) {
    return cmsJsonError(error);
  }
}