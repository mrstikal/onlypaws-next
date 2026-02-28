import type { AuthUser } from '@/lib/authTypes';
import { ApiError } from '@/lib/api/errors';
import { parseBigIntParam } from '@/lib/server/ids';
import { now, stampCreate, stampUpdate } from '@/lib/server/timestamps';
import { hasLength, trimToString } from '@/lib/server/validation';
import { prisma } from '@/lib/prisma';
import { assertCmsStaff } from '@/lib/server/cms/authz';

export async function createCmsBreed(actor: AuthUser, rawBody: unknown) {
  assertCmsStaff(actor);

  const body = (rawBody ?? {}) as Record<string, unknown>;

  const name = trimToString(body.name);
  if (!hasLength(name, 1, 255)) {
    throw new ApiError(name.length === 0 ? 'Název je povinný' : 'Název je příliš dlouhý', 400);
  }

  const species = trimToString(body.species);
  if (species !== 'dog' && species !== 'cat') {
    throw new ApiError('Neplatný druh', 400);
  }

  const apiId = body.api_id == null ? null : trimToString(body.api_id) || null;
  const description = body.description == null ? null : trimToString(body.description) || null;

  const current = now();

  const created = await prisma.breeds.create({
    data: {
      name,
      species,
      api_id: apiId,
      description,
      ...stampCreate(current),
    },
    select: { id: true },
  });

  return { id: created.id.toString() };
}

export async function updateCmsBreed(actor: AuthUser, rawBreedId: unknown, rawBody: unknown) {
  assertCmsStaff(actor);

  const breedId = parseBigIntParam(rawBreedId);
  if (!breedId) throw new ApiError('Neplatné ID', 400);

  const existing = await prisma.breeds.findUnique({ where: { id: breedId }, select: { id: true } });
  if (!existing) throw new ApiError('Nenalezeno', 404);

  const body = (rawBody ?? {}) as Record<string, unknown>;

  const name = trimToString(body.name);
  if (!hasLength(name, 1, 255)) {
    throw new ApiError(name.length === 0 ? 'Název je povinný' : 'Název je příliš dlouhý', 400);
  }

  const species = trimToString(body.species);
  if (species !== 'dog' && species !== 'cat') {
    throw new ApiError('Neplatný druh', 400);
  }

  const apiId = body.api_id == null ? null : trimToString(body.api_id) || null;
  const description = body.description == null ? null : trimToString(body.description) || null;

  const current = now();

  await prisma.breeds.update({
    where: { id: breedId },
    data: { name, species, api_id: apiId, description, ...stampUpdate(current) },
    select: { id: true },
  });
}

export async function deleteCmsBreed(actor: AuthUser, rawBreedId: unknown) {
  assertCmsStaff(actor);

  const breedId = parseBigIntParam(rawBreedId);
  if (!breedId) throw new ApiError('Neplatné ID', 400);

  // Security: if there are pets with this breed_id, prevent deletion (to avoid FK errors)
  const used = await prisma.pets.findFirst({ where: { breed_id: breedId }, select: { id: true } });
  if (used) throw new ApiError('Plemeno se používá u mazlíčků', 409);

  const existing = await prisma.breeds.findUnique({ where: { id: breedId }, select: { id: true } });
  if (!existing) throw new ApiError('Nenalezeno', 404);

  await prisma.breeds.delete({ where: { id: breedId } });
}

