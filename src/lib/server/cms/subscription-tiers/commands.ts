import type { AuthUser } from '@/lib/authTypes';
import { ApiError } from '@/lib/api/errors';
import { parseBigIntParam } from '@/lib/server/ids';
import { now, stampCreate, stampUpdate } from '@/lib/server/timestamps';
import { hasLength, trimToString } from '@/lib/server/validation';
import { prisma } from '@/lib/prisma';
import { normalizeSlug } from '@/lib/server/cms/shared/slug';
import { assertCmsCan } from '@/lib/server/cms/authz';

export async function createCmsSubscriptionTier(actor: AuthUser, rawBody: unknown) {
  assertCmsCan(actor, 'subscription_tiers', 'create');

  const body = (rawBody ?? {}) as Record<string, unknown>;

  const name = trimToString(body.name);
  if (!hasLength(name, 1, 255)) {
    throw new ApiError(name.length === 0 ? 'Název je povinný' : 'Název je příliš dlouhý', 400);
  }

  const slug = normalizeSlug(body.slug);
  if (!slug) throw new ApiError('Neplatný slug', 400);

  const price = Number(body.price_monthly);
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) {
    throw new ApiError('Neplatná cena', 400);
  }

  const description = body.description == null ? null : trimToString(body.description) || null;

  const current = now();

  const created = await prisma.subscription_tiers.create({
    data: {
      name,
      slug,
      price_monthly: Math.trunc(price),
      description,
      ...stampCreate(current),
    },
    select: { id: true },
  });

  return { id: created.id.toString() };
}

export async function updateCmsSubscriptionTier(actor: AuthUser, rawTierId: unknown, rawBody: unknown) {
  assertCmsCan(actor, 'subscription_tiers', 'update');

  const tierId = parseBigIntParam(rawTierId);
  if (!tierId) throw new ApiError('Neplatné ID', 400);

  const existing = await prisma.subscription_tiers.findUnique({ where: { id: tierId }, select: { id: true } });
  if (!existing) throw new ApiError('Nenalezeno', 404);

  const body = (rawBody ?? {}) as Record<string, unknown>;

  const name = trimToString(body.name);
  if (!hasLength(name, 1, 255)) {
    throw new ApiError(name.length === 0 ? 'Název je povinný' : 'Název je příliš dlouhý', 400);
  }

  const slug = normalizeSlug(body.slug);
  if (!slug) throw new ApiError('Neplatný slug', 400);

  const price = Number(body.price_monthly);
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) {
    throw new ApiError('Neplatná cena', 400);
  }

  const description = body.description == null ? null : trimToString(body.description) || null;

  const current = now();

  await prisma.subscription_tiers.update({
    where: { id: tierId },
    data: {
      name,
      slug,
      price_monthly: Math.trunc(price),
      description,
      ...stampUpdate(current),
    },
    select: { id: true },
  });
}

export async function deleteCmsSubscriptionTier(actor: AuthUser, rawTierId: unknown) {
  assertCmsCan(actor, 'subscription_tiers', 'delete');

  const tierId = parseBigIntParam(rawTierId);
  if (!tierId) throw new ApiError('Neplatné ID', 400);

  const used = await prisma.posts.findFirst({ where: { subscription_tier_id: tierId }, select: { id: true } });
  if (used) throw new ApiError('Tier se používá u postů', 409);

  const existing = await prisma.subscription_tiers.findUnique({ where: { id: tierId }, select: { id: true } });
  if (!existing) throw new ApiError('Nenalezeno', 404);

  await prisma.subscription_tiers.delete({ where: { id: tierId } });
}

