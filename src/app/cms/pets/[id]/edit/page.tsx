// src/app/cms/pets/[id]/edit/page.tsx
import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import CmsPetForm from '@/components/cms/CmsPetForm';
import { parseBigIntParam } from '@/lib/cms/params';

export default async function CmsPetEditPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');

  const { id } = await params;
  const petId = parseBigIntParam(id);
  if (!petId) notFound();

  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: {
      id: true,
      user_id: true,
      name: true,
      bio: true,
      age_years: true,
      age_months: true,
      breed_id: true,
      profile_picture: true,
    },
  });
  if (!pet) notFound();

  const staff = isStaff(auth.user);
  if (!staff && pet.user_id !== BigInt(auth.user.id)) notFound();

  const breedsRaw = await prisma.breeds.findMany({
    orderBy: [{ species: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, species: true },
  });

  const breeds = breedsRaw.map((b) => ({ id: b.id.toString(), name: b.name, species: b.species }));

  return (
    <CmsPetForm
      mode="edit"
      petId={pet.id.toString()}
      breeds={breeds}
      initial={{
        name: pet.name,
        bio: pet.bio ?? '',
        age_years: pet.age_years ?? null,
        age_months: pet.age_months ?? null,
        breed_id: pet.breed_id ? pet.breed_id.toString() : null,
        profile_picture: pet.profile_picture ?? null,
      }}
    />
  );
}