// src/app/api/cms/pets/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createCmsPet } from '@/lib/server/cms/pets/commands';
import { cmsJsonError } from '@/lib/server/cms/http';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const pet = await createCmsPet(auth.user, body);
    return NextResponse.json({ ok: true, id: pet.id });
  } catch (error) {
    return cmsJsonError(error);
  }
}