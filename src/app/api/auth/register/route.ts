import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { getRequestMeta, SESSION_COOKIE_NAME } from '@/lib/auth';

type Body = {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const passwordConfirmation = body.password_confirmation ?? '';

  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Vyplň jméno.';
  if (!email) errors.email = 'Vyplň email.';
  if (!password) errors.password = 'Vyplň heslo.';
  if (password && password.length < 8) errors.password = 'Heslo musí mít alespoň 8 znaků.';
  if (password !== passwordConfirmation) errors.password_confirmation = 'Hesla se neshodují.';

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const existing = await prisma.users.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ ok: false, errors: { email: 'Účet s tímto emailem už existuje.' } }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);

  const user = await prisma.users.create({
    data: {
      name,
      email,
      password: passwordHash,
    },
    select: { id: true, name: true, email: true },
  });

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
  });

  return res;
}