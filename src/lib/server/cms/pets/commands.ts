import type { AuthUser } from '@/lib/authTypes';
import { ApiError } from '@/lib/api/errors';
import { parseBigIntParam } from '@/lib/server/ids';
import { now, stampCreate, stampUpdate } from '@/lib/server/timestamps';
import { hasLength, trimToString } from '@/lib/server/validation';
import { prisma } from '@/lib/prisma';
import { normalizeCmsMediaFileName } from '@/lib/server/cms/shared/media';
import { assertCmsNotStaff, assertCmsOwnerOrStaff } from '@/lib/server/cms/authz';

function parseAge(raw: unknown) {
  if (raw == null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function createCmsPet(actor: AuthUser, rawBody: unknown) {
  assertCmsNotStaff(actor);

  const body = (rawBody ?? {}) as Record<string, unknown>;

  const name = trimToString(body.name);
  if (!hasLength(name, 1, 255)) {
    throw new ApiError(name.length === 0 ? 'Jméno je povinné' : 'Jméno je příliš dlouhé', 400);
  }

  const bio = body.bio == null ? null : trimToString(body.bio);

  const ageYears = parseAge(body.age_years);
  const ageMonths = parseAge(body.age_months);

  if (ageYears != null && (!Number.isInteger(ageYears) || ageYears < 0 || ageYears > 50)) {
    throw new ApiError('Neplatný věk (roky)', 400);
  }
  if (ageMonths != null && (!Number.isInteger(ageMonths) || ageMonths < 0 || ageMonths > 11)) {
    throw new ApiError('Neplatný věk (měsíce)', 400);
  }

  const breedIdRaw = body.breed_id ?? null;
  const breedId = breedIdRaw ? parseBigIntParam(breedIdRaw) : null;

  const profilePicture = body.profile_picture ? normalizeCmsMediaFileName('pets', body.profile_picture) : null;
  if (body.profile_picture && !profilePicture) {
    throw new ApiError('Neplatný avatar', 400);
  }

  if (breedId) {
    const breed = await prisma.breeds.findUnique({ where: { id: breedId }, select: { id: true } });
    if (!breed) throw new ApiError('Neplatné plemeno', 400);
  }

  const current = now();

  const pet = await prisma.pets.create({
    data: {
      user_id: BigInt(actor.id),
      name,
      bio,
      age_years: ageYears,
      age_months: ageMonths,
      breed_id: breedId,
      profile_picture: profilePicture,
      ...stampCreate(current),
      followers_count: 0,
      posts_count: 0,
      likes_count: 0,
      comments_count: 0,
    },
    select: { id: true },
  });

  return { id: pet.id.toString() };
}

export async function updateCmsPet(actor: AuthUser, rawPetId: unknown, rawBody: unknown) {
  const petId = parseBigIntParam(rawPetId);
  if (!petId) throw new ApiError('Neplatné ID', 400);

  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: { id: true, user_id: true },
  });
  if (!pet) throw new ApiError('Nenalezeno', 404);

  assertCmsOwnerOrStaff(actor, pet.user_id);

  const body = (rawBody ?? {}) as Record<string, unknown>;

  const name = trimToString(body.name);
  if (!hasLength(name, 1, 255)) {
    throw new ApiError(name.length === 0 ? 'Jméno je povinné' : 'Jméno je příliš dlouhé', 400);
  }

  const bio = body.bio == null ? null : trimToString(body.bio);

  const ageYears = parseAge(body.age_years);
  const ageMonths = parseAge(body.age_months);

  if (ageYears != null && (!Number.isInteger(ageYears) || ageYears < 0 || ageYears > 50)) {
    throw new ApiError('Neplatný věk (roky)', 400);
  }
  if (ageMonths != null && (!Number.isInteger(ageMonths) || ageMonths < 0 || ageMonths > 11)) {
    throw new ApiError('Neplatný věk (měsíce)', 400);
  }

  const breedIdRaw = body.breed_id ?? null;
  const breedId = breedIdRaw ? parseBigIntParam(breedIdRaw) : null;

  const profilePicture = body.profile_picture ? normalizeCmsMediaFileName('pets', body.profile_picture) : null;
  if (body.profile_picture && !profilePicture) {
    throw new ApiError('Neplatný avatar', 400);
  }

  if (breedId) {
    const breed = await prisma.breeds.findUnique({ where: { id: breedId }, select: { id: true } });
    if (!breed) throw new ApiError('Neplatné plemeno', 400);
  }

  const current = now();

  await prisma.pets.update({
    where: { id: petId },
    data: {
      name,
      bio,
      age_years: ageYears,
      age_months: ageMonths,
      breed_id: breedId,
      profile_picture: profilePicture,
      ...stampUpdate(current),
    },
    select: { id: true },
  });
}

export async function deleteCmsPet(actor: AuthUser, rawPetId: unknown) {
  const petId = parseBigIntParam(rawPetId);
  if (!petId) throw new ApiError('Neplatné ID', 400);

  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: { id: true, user_id: true },
  });

  if (!pet) throw new ApiError('Nenalezeno', 404);

  assertCmsOwnerOrStaff(actor, pet.user_id);

  await prisma.pets.delete({ where: { id: petId } });
}
