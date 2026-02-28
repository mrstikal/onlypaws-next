import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/utils/slugify';

type Params = { id: string };

export default async function PostIdRedirectPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  let postId: bigint;
  try {
    postId = BigInt(id);
  } catch {
    redirect('/');
  }

  const post = await prisma.posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      caption: true,
      pet: { select: { name: true } },
    },
  });

  if (!post) redirect('/');

  const base = `${post.pet?.name ?? 'pet'} ${post.caption ?? 'post'} ${post.id.toString()}`;
  const expectedSlug = slugify(base) || `post-${post.id.toString()}`;

  redirect(`/posts/${post.id.toString()}/${expectedSlug}`);
}