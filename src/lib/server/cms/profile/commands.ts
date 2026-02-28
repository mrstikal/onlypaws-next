import type { AuthUser } from '@/lib/authTypes';
import { ApiError } from '@/lib/api/errors';
import { now, stampUpdate } from '@/lib/server/timestamps';
import { hasLength, trimToString } from '@/lib/server/validation';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function updateCmsProfile(actor: AuthUser, rawBody: unknown) {
  const body = (rawBody ?? {}) as Record<string, unknown>;

  const name = trimToString(body.name);
  if (!hasLength(name, 1, 255)) {
    throw new ApiError(name.length === 0 ? 'Jméno je povinné' : 'Jméno je příliš dlouhé', 400);
  }

  const current = now();

  const updated = await prisma.users.update({
    where: { id: BigInt(actor.id) },
    data: { name, ...stampUpdate(current) },
    select: { id: true, name: true, email: true, role: true },
  });

  return {
    id: updated.id.toString(),
    name: updated.name,
    email: updated.email,
    role: updated.role,
  };
}

function isStrongEnough(pw: string) {
  return hasLength(pw, 8, 200);
}

export async function changeCmsPassword(actor: AuthUser, rawBody: unknown) {
  const body = (rawBody ?? {}) as Record<string, unknown>;

  const currentPassword = String(body.current_password ?? '');
  const newPassword = String(body.new_password ?? '');
  const newPasswordConfirm = String(body.new_password_confirm ?? '');

  if (!currentPassword) throw new ApiError('Aktuální heslo je povinné', 400);
  if (!newPassword) throw new ApiError('Nové heslo je povinné', 400);
  if (newPassword !== newPasswordConfirm) throw new ApiError('Nová hesla se neshodují', 400);
  if (!isStrongEnough(newPassword)) {
    throw new ApiError('Nové heslo musí mít alespoň 8 znaků', 400);
  }

  const user = await prisma.users.findUnique({
    where: { id: BigInt(actor.id) },
    select: { id: true, password: true },
  });

  if (!user) throw new ApiError('Nenalezeno', 404);

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw new ApiError('Aktuální heslo není správně', 400);

  const hashed = await bcrypt.hash(newPassword, 10);
  const current = now();

  await prisma.users.update({
    where: { id: user.id },
    data: { password: hashed, ...stampUpdate(current) },
    select: { id: true },
  });

  // Invalidate all sessions (including current one)
  await prisma.sessions.deleteMany({
    where: { user_id: user.id },
  });
}

