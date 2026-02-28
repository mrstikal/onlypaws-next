import type { AuthUser } from '@/lib/authTypes';
import { ApiError } from '@/lib/api/errors';
import { parseBigIntParam } from '@/lib/server/ids';
import { prisma } from '@/lib/prisma';
import { assertCmsStaff } from '@/lib/server/cms/authz';

export async function deleteCmsFollow(actor: AuthUser, rawFollowId: unknown) {
  assertCmsStaff(actor);

  const followId = parseBigIntParam(rawFollowId);
  if (!followId) throw new ApiError('Neplatné ID', 400);

  const existing = await prisma.follows.findUnique({ where: { id: followId }, select: { id: true } });
  if (!existing) throw new ApiError('Nenalezeno', 404);

  await prisma.follows.delete({ where: { id: followId } });
}

