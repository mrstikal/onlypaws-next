import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { parseBigIntParam } from '@/lib/server/ids';
import { isStaffRole } from '@/lib/server/roles';
import { now, stampCreate } from '@/lib/server/timestamps';
import { POLYMORPHIC_MODEL_NAMES } from '@/lib/server/cms/polymorphic';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (isStaffRole(auth.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const postId = parseBigIntParam(id);
  if (!postId) return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });

  const userId = BigInt(auth.user.id);

  const post = await prisma.posts.findUnique({
    where: { id: postId },
    select: { id: true, likes_count: true, pet: { select: { user_id: true } } },
  });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (post.pet?.user_id === userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const likeableTypePost = POLYMORPHIC_MODEL_NAMES.POST;
  const createdAt = now();

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.likes.create({
        data: {
          user_id: userId,
          likeable_type: likeableTypePost,
          likeable_id: postId,
          ...stampCreate(createdAt),
        },
      });

      return tx.posts.update({
        where: { id: postId },
        data: { likes_count: { increment: 1 } },
        select: { likes_count: true },
      });
    });

    return NextResponse.json({ liked: true, likes_count: updated.likes_count ?? 0 });
  } catch (error: any) {
    // P2002 = unique constraint violation → like už existuje
    if (error.code === 'P2002') {
      // Získat aktuální likes_count bez inkrementu
      const current = await prisma.posts.findUnique({
        where: { id: postId },
        select: { likes_count: true },
      });
      return NextResponse.json({ liked: true, likes_count: current?.likes_count ?? 0 });
    }
    throw error;
  }
}