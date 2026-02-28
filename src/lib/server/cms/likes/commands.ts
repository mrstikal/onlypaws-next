import type { AuthUser } from '@/lib/authTypes';
import { ApiError } from '@/lib/api/errors';
import { parseBigIntParam } from '@/lib/server/ids';
import { prisma } from '@/lib/prisma';
import { likeableKind } from '@/lib/server/cms/polymorphic';
import { assertCmsStaff } from '@/lib/server/cms/authz';

export async function deleteCmsLike(actor: AuthUser, rawLikeId: unknown) {
  assertCmsStaff(actor);

  const likeId = parseBigIntParam(rawLikeId);
  if (!likeId) throw new ApiError('Invalid like id', 400);

  const like = await prisma.likes.findUnique({
    where: { id: likeId },
    select: { id: true, likeable_type: true, likeable_id: true },
  });

  if (!like) throw new ApiError('Not found', 404);

  await prisma.$transaction(async (tx) => {
    await tx.likes.delete({ where: { id: likeId } });

    const kind = likeableKind(like.likeable_type);
    if (kind === 'post') {
      await tx.posts.update({
        where: { id: like.likeable_id },
        data: { likes_count: { decrement: 1 } },
        select: { id: true },
      });
    } else if (kind === 'pet') {
      await tx.pets.update({
        where: { id: like.likeable_id },
        data: { likes_count: { decrement: 1 } },
        select: { id: true },
      });
    } else if (kind === 'comment') {
      await tx.comments.update({
        where: { id: like.likeable_id },
        data: { likes_count: { decrement: 1 } },
        select: { id: true },
      });
    }
  });
}

