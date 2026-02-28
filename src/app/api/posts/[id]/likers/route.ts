import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseBigIntParam } from '@/lib/server/ids';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const postId = parseBigIntParam(id);
  if (!postId) return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });

  const likeableTypePost = 'App\\Models\\Post';

  const likes = await prisma.likes.findMany({
    where: {
      likeable_type: likeableTypePost,
      likeable_id: postId,
    },
    orderBy: [{ id: 'desc' }],
    take: 200,
    select: {
      user: { select: { id: true, name: true } },
    },
  });

  const likers = likes
    .map((l) => l.user)
    .filter(Boolean)
    .map((u) => ({ id: Number(u!.id.toString()), name: u!.name }));

  return NextResponse.json({ likers });
}