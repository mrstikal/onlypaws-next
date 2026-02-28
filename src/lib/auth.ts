import 'server-only';

import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
export type { UserRole, AuthUser, AuthState } from '@/lib/authTypes';

export const SESSION_COOKIE_NAME = 'op_session';

function toUserRole(value: unknown) {
  return value === 'admin' || value === 'superadmin' ? value : 'user';
}

export async function getAuth() {
  const sessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;
  if (!sessionId) return { isAuthed: false, user: null } as const;

  const session = await prisma.sessions.findUnique({
    where: { id: sessionId },
    select: { id: true, user_id: true },
  });

  if (!session?.user_id) return { isAuthed: false, user: null } as const;

  const user = await prisma.users.findUnique({
    where: { id: session.user_id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) return { isAuthed: false, user: null } as const;

  return {
    isAuthed: true,
    user: {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: toUserRole(user.role),
    },
  } as const;
}

export async function getRequestMeta() {
  const h = await headers();
  const userAgent = h.get('user-agent') ?? null;

  const forwardedFor = h.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() ?? null;

  return { ip, userAgent };
}