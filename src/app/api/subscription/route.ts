import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { parseTierSlug } from '@/lib/server/validation';
import { now, stampCreate, stampUpdate } from '@/lib/server/timestamps';

type Body = { tierSlug?: string };

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const tierSlug = parseTierSlug(body.tierSlug);
  if (!tierSlug) return NextResponse.json({ ok: false, error: 'Invalid tier' }, { status: 400 });

  const tier = await prisma.subscription_tiers.findUnique({
    where: { slug: tierSlug },
    select: { id: true, slug: true },
  });

  if (!tier) return NextResponse.json({ ok: false, error: 'Tier not found' }, { status: 404 });

  const userId = BigInt(auth.user.id);
  const current = now();

  await prisma.subscriptions.upsert({
    where: { user_id: userId },
    create: {
      user_id: userId,
      subscription_tier_id: tier.id,
      starts_at: current,
      ends_at: null,
      ...stampCreate(current),
    },
    update: {
      subscription_tier_id: tier.id,
      starts_at: current,
      ends_at: null,
      ...stampUpdate(current),
    },
  });

  return NextResponse.json({ ok: true, viewerTierSlug: tier.slug });
}