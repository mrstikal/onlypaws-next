import type { AuthUser } from '@/lib/authTypes';
import { ApiError } from '@/lib/api/errors';
import { parseBigIntParam } from '@/lib/server/ids';
import { isAllowedRole } from '@/lib/server/roles';
import { now, stampUpdate } from '@/lib/server/timestamps';
import { prisma } from '@/lib/prisma';
import { assertCmsCan } from '@/lib/server/cms/authz';

export async function updateCmsUserRole(actor: AuthUser, rawUserId: unknown, rawBody: unknown) {
  assertCmsCan(actor, 'users', 'update');

  const userId = parseBigIntParam(rawUserId);
  if (!userId) throw new ApiError('Neplatné ID', 400);

  const body = (rawBody ?? {}) as Record<string, unknown>;
  const role = body.role;

  if (!isAllowedRole(role)) {
    throw new ApiError('Neplatná role', 400);
  }

  const current = now();

  const updated = await prisma.users.update({
    where: { id: userId },
    data: { role, ...stampUpdate(current) },
    select: { id: true, role: true },
  });

  return { id: updated.id.toString(), role: updated.role };
}

export async function deleteCmsUser(actor: AuthUser, rawUserId: unknown) {
  assertCmsCan(actor, 'users', 'delete');

  const userIdStr = String(rawUserId ?? '');
  if (userIdStr === actor.id) {
    throw new ApiError('Nemůžete smazat sami sebe', 400);
  }

  const userId = parseBigIntParam(userIdStr);
  if (!userId) throw new ApiError('Neplatné ID', 400);

  const existing = await prisma.users.findUnique({ where: { id: userId }, select: { id: true } });
  if (!existing) throw new ApiError('Uživatel nenalezen', 404);

  await prisma.users.delete({ where: { id: userId }, select: { id: true } });
}

