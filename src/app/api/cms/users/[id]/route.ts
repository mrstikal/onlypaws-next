// src/app/api/cms/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { cmsJsonError } from '@/lib/server/cms/http';
import { deleteCmsUser, updateCmsUserRole } from '@/lib/server/cms/users/commands';

export const runtime = 'nodejs';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const result = await updateCmsUserRole(auth.user, id, body);
    return NextResponse.json({ ok: true, id: result.id, role: result.role });
  } catch (error) {
    return cmsJsonError(error);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });

  try {
    const { id } = await ctx.params;
    await deleteCmsUser(auth.user, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cmsJsonError(error);
  }
}