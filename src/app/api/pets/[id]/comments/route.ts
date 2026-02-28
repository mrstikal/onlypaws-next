import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { bigIntToString, parseBigIntParam } from '@/lib/server/ids';
import { hasLength, trimToString } from '@/lib/server/validation';
import { now, stampCreate } from '@/lib/server/timestamps';
import { POLYMORPHIC_MODEL_NAMES } from '@/lib/server/cms/polymorphic';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const petId = parseBigIntParam(id);
  if (!petId) return NextResponse.json({ error: 'Invalid pet id' }, { status: 400 });

  const bodyJson = await req.json().catch(() => null);
  const body = trimToString(bodyJson?.body);
  const parentIdRaw = bodyJson?.parent_id ?? null;

  if (!hasLength(body, 1, 1000)) {
    return NextResponse.json({ error: body.length === 0 ? 'Body is required' : 'Body too long' }, { status: 400 });
  }

  const parentId = parentIdRaw ? parseBigIntParam(parentIdRaw) : null;

  const commentableTypePet = POLYMORPHIC_MODEL_NAMES.PET;

  if (parentId) {
    const parent = await prisma.comments.findFirst({
      where: {
        id: parentId,
        commentable_type: commentableTypePet,
        commentable_id: petId,
      },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ error: 'Invalid parent_id' }, { status: 400 });
  }

  const createdAt = now();

  const created = await prisma.comments.create({
    data: {
      body,
      user_id: BigInt(auth.user.id),
      commentable_type: commentableTypePet,
      commentable_id: petId,
      parent_id: parentId,
      likes_count: 0,
      ...stampCreate(createdAt),
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  await prisma.pets.update({
    where: { id: petId },
    data: { comments_count: { increment: 1 } },
  });

  return NextResponse.json({
    comment: {
      id: bigIntToString(created.id),
      body: created.body,
      likes_count: created.likes_count ?? 0,
      liked_by_me: false,
      created_at: created.created_at ? new Date(created.created_at).toISOString() : null,
      user: created.user ? { id: bigIntToString(created.user.id), name: created.user.name } : null,
      children: [],
    },
  });
}