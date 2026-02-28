// src/app/api/cms/profile/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { cmsJsonError } from '@/lib/server/cms/http';
import { updateCmsProfile } from '@/lib/server/cms/profile/commands';

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const user = await updateCmsProfile(auth.user, body);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return cmsJsonError(error);
  }
}