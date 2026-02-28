import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { getRequestMeta, SESSION_COOKIE_NAME } from '@/lib/auth';
import { validationErrors } from '@/lib/apiResponse';

type Body = { email?: string; password?: string; remember?: boolean };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;

  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const remember = !!body.remember;

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, errors: { email: 'Vyplň email.', password: 'Vyplň heslo.' } },
      { status: 422 },
    );
  }

  const user = await prisma.users.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, password: true },
  });

  if (!user) {
    return validationErrors({ email: 'Neplatné přihlašovací údaje.' });
  }

  const storedHash =
    user.password.startsWith('$2y$')
      ? `$2b$${user.password.slice(4)}`
      : user.password;

  const passOk = await compare(password, storedHash);
  if (!passOk) {
    return validationErrors({ email: 'Neplatné přihlašovací údaje.' });
  }

  const sessionId = randomBytes(32).toString('hex');
  const nowSec = Math.floor(Date.now() / 1000);
  const { ip, userAgent } = await getRequestMeta();

  await prisma.sessions.create({
    data: {
      id: sessionId,
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      payload: '{}',
      last_activity: nowSec,
    },
  });

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id.toString(), name: user.name, email: user.email },
  });

  res.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: remember ? 60 * 60 * 24 * 30 : undefined,
  });

  return res;
}