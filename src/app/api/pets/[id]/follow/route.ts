import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { parseBigIntParam } from '@/lib/server/ids';
import { isStaffRole } from '@/lib/server/roles';
import { now, stampCreate } from '@/lib/server/timestamps';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (isStaffRole(auth.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const petId = parseBigIntParam(id);
  if (!petId) return NextResponse.json({ error: 'Invalid pet id' }, { status: 400 });

  const userId = BigInt(auth.user.id);

  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: { id: true, user_id: true, followers_count: true },
  });
  if (!pet) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (pet.user_id === userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const followerType = 'App\\Models\\User';
  const followableType = 'App\\Models\\Pet';

  const existing = await prisma.follows.findFirst({
    where: {
      follower_type: followerType,
      follower_id: userId,
      followable_type: followableType,
      followable_id: petId,
    },
    select: { id: true },
  });

  if (existing) {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.follows.delete({ where: { id: existing.id } });
      return tx.pets.update({
        where: { id: petId },
        data: { followers_count: { decrement: 1 } },
        select: { followers_count: true },
      });
    });

    await prisma.pets.updateMany({
      where: { id: petId, followers_count: { lt: 0 } },
      data: { followers_count: 0 },
    });

    return NextResponse.json({
      followed_by_me: false,
      followers_count: updated.followers_count ?? 0,
    });
  }

  const createdAt = now();

  const updated = await prisma.$transaction(async (tx) => {
    await tx.follows.create({
      data: {
        follower_type: followerType,
        follower_id: userId,
        followable_type: followableType,
        followable_id: petId,
        ...stampCreate(createdAt),
      },
    });

    return tx.pets.update({
      where: { id: petId },
      data: { followers_count: { increment: 1 } },
      select: { followers_count: true },
    });
  });

  return NextResponse.json({
    followed_by_me: true,
    followers_count: updated.followers_count ?? 0,
  });
}