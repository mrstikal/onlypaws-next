// src/app/api/cms/profile/password/route.ts
import { NextResponse } from 'next/server';
import { getAuth, SESSION_COOKIE_NAME } from '@/lib/auth';
import { cmsJsonError } from '@/lib/server/cms/http';
import { changeCmsPassword } from '@/lib/server/cms/profile/commands';

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    await changeCmsPassword(auth.user, body);

    // Delete session cookie to make logout immediate in browser
    const res = NextResponse.json({ ok: true, loggedOut: true });
    res.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 });

    return res;
  } catch (error) {
    return cmsJsonError(error);
  }
}