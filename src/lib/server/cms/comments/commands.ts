import type { AuthUser } from '@/lib/authTypes';
import { ApiError } from '@/lib/api/errors';
import { parseBigIntParam } from '@/lib/server/ids';
import { now, stampUpdate } from '@/lib/server/timestamps';
import { hasLength, trimToString } from '@/lib/server/validation';
import { prisma } from '@/lib/prisma';
import { commentableKind } from '@/lib/server/cms/polymorphic';
import { assertCmsStaff } from '@/lib/server/cms/authz';

async function countCascadeComments(params: { rootId: bigint; commentableType: string; commentableId: bigint }) {
  // Counts root comment + all descendants by parent_id (recursively).
  // We limit it to the same commentable for safety.
  const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    WITH RECURSIVE tree AS (
      SELECT id
      FROM comments
      WHERE id = ${params.rootId}
        AND commentable_type = ${params.commentableType}
        AND commentable_id = ${params.commentableId}
      UNION ALL
      SELECT c.id
      FROM comments c
      JOIN tree t ON c.parent_id = t.id
      WHERE c.commentable_type = ${params.commentableType}
        AND c.commentable_id = ${params.commentableId}
    )
    SELECT COUNT(*)::bigint AS cnt
    FROM tree
  `;

  const cnt = rows?.[0]?.cnt ?? BigInt(0);
  return Number(cnt);
}

export async function updateCmsComment(actor: AuthUser, rawCommentId: unknown, rawBody: unknown) {
  assertCmsStaff(actor);

  const commentId = parseBigIntParam(rawCommentId);
  if (!commentId) throw new ApiError('Neplatné ID', 400);

  const existing = await prisma.comments.findUnique({ where: { id: commentId }, select: { id: true } });
  if (!existing) throw new ApiError('Nenalezeno', 404);

  const body = (rawBody ?? {}) as Record<string, unknown>;
  const text = trimToString(body.body);

  if (!hasLength(text, 1, 1000)) {
    throw new ApiError(text.length === 0 ? 'Text je povinný' : 'Text je příliš dlouhý', 400);
  }

  const current = now();

  await prisma.comments.update({
    where: { id: commentId },
    data: { body: text, ...stampUpdate(current) },
    select: { id: true },
  });
}

export async function deleteCmsComment(actor: AuthUser, rawCommentId: unknown) {
  assertCmsStaff(actor);

  const commentId = parseBigIntParam(rawCommentId);
  if (!commentId) throw new ApiError('Neplatné ID', 400);

  const existing = await prisma.comments.findUnique({
    where: { id: commentId },
    select: { id: true, commentable_type: true, commentable_id: true },
  });
  if (!existing) throw new ApiError('Nenalezeno', 404);

  const toDecrement = await countCascadeComments({
    rootId: commentId,
    commentableType: existing.commentable_type,
    commentableId: existing.commentable_id,
  });

  await prisma.$transaction(async (tx) => {
    // Delete root; DB (FK onDelete: Cascade) will delete descendants too.
    await tx.comments.delete({ where: { id: commentId } });

    const kind = commentableKind(existing.commentable_type);

    if (kind === 'post') {
      await tx.posts.update({
        where: { id: existing.commentable_id },
        data: { comments_count: { decrement: toDecrement } },
        select: { id: true },
      });

      await tx.posts.updateMany({
        where: { id: existing.commentable_id, comments_count: { lt: 0 } },
        data: { comments_count: 0 },
      });
    } else if (kind === 'pet') {
      await tx.pets.update({
        where: { id: existing.commentable_id },
        data: { comments_count: { decrement: toDecrement } },
        select: { id: true },
      });

      await tx.pets.updateMany({
        where: { id: existing.commentable_id, comments_count: { lt: 0 } },
        data: { comments_count: 0 },
      });
    }
  });
}

