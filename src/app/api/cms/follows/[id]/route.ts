// src/app/api/cms/follows/[id]/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { cmsJsonError } from '@/lib/server/cms/http';
import { deleteCmsFollow } from '@/lib/server/cms/follows/commands';

export const runtime = 'nodejs';

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });

  try {
    const { id } = await ctx.params;
    await deleteCmsFollow(auth.user, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cmsJsonError(error);
  }
}