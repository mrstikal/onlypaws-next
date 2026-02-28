// src/app/api/cms/posts/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { cmsJsonError } from '@/lib/server/cms/http';
import { createCmsPost } from '@/lib/server/cms/posts/commands';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const created = await createCmsPost(auth.user, body);
    return NextResponse.json({ ok: true, id: created.id });
  } catch (error) {
    return cmsJsonError(error);
  }
}