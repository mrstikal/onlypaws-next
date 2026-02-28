import React from 'react';
import Image from 'next/image';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import { formatDateTimeCS } from '@/utils/datetime';
import DeletePetInlineButton from '@/components/cms/DeletePetInlineButton';
import { publicUrl } from '@/utils/mediaUrl';
import Link from 'next/link';
import { ROUTES } from '@/constants/routes';
import { parseBigIntParam, bigIntToString } from '@/lib/cms/params';

export default async function CmsPetViewPage({ params }: { params: Promise<{ id: string }> }) {
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
      profile_picture: true,
      likes_count: true,
      followers_count: true,
      posts_count: true,
      comments_count: true,
      created_at: true,
      user: { select: { name: true, email: true } },
      breeds: { select: { name: true, species: true } },
    },
  });

  if (!pet) notFound();

  const staff = isStaff(auth.user);
  if (!staff && bigIntToString(pet.user_id) !== auth.user.id) notFound();

  const userLabel = pet.user?.name?.trim() || pet.user?.email?.trim() || `Uživatel #${bigIntToString(pet.user_id)}`;

  const avatarUrl = publicUrl('pets', pet.profile_picture);

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-sm text-gray-600">Mazlíček #{bigIntToString(pet.id)}</h1>
          <p className="mt-1 text-lg font-semibold">{pet.name}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.CMS.petEdit(bigIntToString(pet.id))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            Upravit
          </Link>

          <DeletePetInlineButton
            petId={String(pet.id)}
            className="px-3 py-1.5 text-sm! font-semibold"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Avatar</div>
          <div className="mt-2 flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
              {avatarUrl ? <Image src={avatarUrl} alt="" className="h-full w-full object-cover" width={80} height={80} /> : null}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Uživatel</div>
          <div className="mt-1 text-sm">{userLabel}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vytvořeno</div>
          <div className="mt-1 text-sm">{formatDateTimeCS(pet.created_at ? new Date(pet.created_at) : null)}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Druh / plemeno</div>
          <div className="mt-1 text-sm">
            {(pet.breeds?.species ?? '—') + (pet.breeds?.name ? ` · ${pet.breeds.name}` : '')}
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Věk</div>
          <div className="mt-1 text-sm">
            {(pet.age_years ?? 0) || (pet.age_months ?? 0) ? `${pet.age_years ?? 0}r ${pet.age_months ?? 0}m` : '—'}
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bio</div>
          <div className="mt-1 whitespace-pre-wrap text-sm">{pet.bio ?? '—'}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Počty</div>
          <div className="mt-1 text-sm">
            Lajky: {pet.likes_count ?? 0} · Sledující: {pet.followers_count ?? 0} · Příspěvky: {pet.posts_count ?? 0} · Komentáře:{' '}
            {pet.comments_count ?? 0}
          </div>
        </div>
      </div>
    </main>
  );
}