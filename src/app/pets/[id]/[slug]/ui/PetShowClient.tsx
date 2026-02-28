'use client';

import { useEffect, useMemo, useState } from 'react';
import PostCard from '@/components/onlypaws/PostCard';
import CommentsThread, { type CommentModel } from '@/components/onlypaws/CommentsThread';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { formatLikesCS, formatFollowersCS, formatCommentsCS } from '@/utils/pluralize';

type PetModel = {
  id: string;
  name: string;
  bio: string | null;
  profile_picture: string | null;
  likes_count: number;
  comments_count: number;
  followers_count: number;
  breed: { name: string; species: 'dog' | 'cat' | string } | null;

  liked_by_me?: boolean;
  followed_by_me?: boolean;
  can_like?: boolean;
  can_follow?: boolean;
  is_owner?: boolean;
};

type PostCardModel = {
  id: string;
  caption: string;
  media_url: string;
  media_type: string;
  likes_count: number;
  comments_count: number;
  is_premium: boolean;
  locked: boolean;
  created_at: string | null;
  pet: { name: string } | null;
  required_tier: { name: string } | null;
  required_tier_slug: string;
  liked_by_me?: boolean;
  can_like?: boolean;
};


type CommentsPagination = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type RawComment = {
  id: number | string;
  body: string;
  created_at: string | null;
  likes_count?: number;
  liked_by_me?: boolean;
  user: { id?: number | string; name?: string } | null;
  children?: RawComment[];
};

async function fetchPetShow(petId: string, page = 1) {
  const sp = new URLSearchParams();
  if (page > 1) sp.set('cpage', String(page));

  const res = await fetch(`/api/pets/${encodeURIComponent(petId)}?${sp.toString()}`, { method: 'GET' });
  if (!res.ok) throw new Error(`Pet show fetch failed: ${res.status}`);

  const raw = (await res.json()) as {
    pet: PetModel;
    posts: PostCardModel[];
    comments: RawComment[];
    commentsPagination: CommentsPagination;
    isAuthed: boolean;

    can_comment?: boolean;
    currentUserId?: string | null;
    can_like_comments?: boolean;
  };

  const ensureCommentsHaveLikes = (comments: RawComment[] | undefined): CommentModel[] => {
    if (!comments) return [];
    return comments.map((c) => {
      const processedChildren = c.children ? ensureCommentsHaveLikes(c.children) : undefined;
      const result: CommentModel = {
        id: c.id ?? '',
        body: c.body ?? '',
        created_at: c.created_at ?? null,
        likes_count: typeof c.likes_count === 'number' ? c.likes_count : 0,
        liked_by_me: c.liked_by_me,
        user: c.user ? { id: c.user.id ?? '', name: c.user.name ?? '' } : null,
        children: processedChildren && processedChildren.length > 0 ? processedChildren : undefined,
      };
      return result;
    });
  };

  return {
    pet: raw.pet,
    posts: raw.posts,
    comments: ensureCommentsHaveLikes(raw.comments),
    commentsPagination: raw.commentsPagination,
    isAuthed: raw.isAuthed,
    can_comment: raw.can_comment,
    currentUserId: raw.currentUserId,
    can_like_comments: raw.can_like_comments,
  };
}

function toPetImageSrc(value: string | null): string | null {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;

  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return s;

  const cleaned = s.startsWith('pets/') ? s.slice('pets/'.length) : s;
  return `/pets/${cleaned}`;
}

export default function PetShowClient({ petId }: { petId: string }) {
  const [bootLoading, setBootLoading] = useState(true);

  const [pet, setPet] = useState<PetModel | null>(null);
  const [posts, setPosts] = useState<PostCardModel[]>([]);

  const [comments, setComments] = useState<CommentModel[]>([]);
  const [commentsPagination, setCommentsPagination] = useState<CommentsPagination>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [isAuthed, setIsAuthed] = useState(false);
  const [canComment, setCanComment] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canLikeComments, setCanLikeComments] = useState<boolean>(true);

  const [following, setFollowing] = useState(false);
  const [likingPet, setLikingPet] = useState(false);

  const [likingCommentIds, setLikingCommentIds] = useState<Record<number | string, boolean>>({});
  const [replyingCommentIds, setReplyingCommentIds] = useState<Record<number | string, boolean>>({});

  const toggleFollow = async () => {
    if (!pet) return;
    if (!isAuthed) return;
    if (following) return;

    const followedByMe = Boolean(pet.followed_by_me);
    const canFollow = Boolean(pet.can_follow);
    if (!followedByMe && !canFollow) return;

    setFollowing(true);
    try {
      const res = await fetch(`/api/pets/${encodeURIComponent(pet.id)}/follow`, { method: 'POST' });

      if (res.status === 403) return;
      if (!res.ok) throw new Error(`Follow failed: ${res.status}`);

      const data = (await res.json()) as { followed_by_me: boolean; followers_count: number };

      setPet((prev) =>
        prev
          ? {
              ...prev,
              followed_by_me: data.followed_by_me,
              followers_count: data.followers_count ?? prev.followers_count,
            }
          : prev,
      );
    } finally {
      setFollowing(false);
    }
  };

  const likePet = async () => {
    if (!pet) return;
    if (!isAuthed) return;
    if (likingPet || Boolean(pet.liked_by_me)) return;

    const canLike = Boolean(pet.can_like);
    if (!canLike) return;

    setLikingPet(true);
    try {
      const res = await fetch(`/api/pets/${encodeURIComponent(pet.id)}/likes`, { method: 'POST' });

      if (res.status === 403) return;
      if (!res.ok) throw new Error(`Like failed: ${res.status}`);

      const data = (await res.json()) as { liked: boolean; likes_count: number };

      setPet((prev) =>
        prev
          ? {
              ...prev,
              liked_by_me: data.liked,
              likes_count: data.likes_count ?? prev.likes_count,
            }
          : prev,
      );
    } finally {
      setLikingPet(false);
    }
  };

  useEffect(() => {
    fetchPetShow(petId, 1)
      .then((data) => {
        setPet(data.pet);
        setPosts(data.posts ?? []);
        setComments(data.comments ?? []);
        setCommentsPagination(data.commentsPagination);

        const authed = Boolean(data.isAuthed);
        setIsAuthed(authed);

        setCanComment(typeof data.can_comment === 'boolean' ? data.can_comment : authed);
        setCurrentUserId(typeof data.currentUserId === 'string' ? data.currentUserId : null);
        setCanLikeComments(typeof data.can_like_comments === 'boolean' ? data.can_like_comments : authed);
      })
      .finally(() => setBootLoading(false));
  }, [petId]);

  const canLoadMoreComments = useMemo(() => {
    return commentsPagination.current_page < commentsPagination.last_page;
  }, [commentsPagination]);

  const loadMoreComments = async () => {
    if (!canLoadMoreComments) return;

    const nextPage = commentsPagination.current_page + 1;
    const data = await fetchPetShow(petId, nextPage);

    const seen = new Set(comments.map((c) => c.id));
    const next = (data.comments ?? []).filter((c) => !seen.has(c.id));

    setComments((prev) => prev.concat(next));
    setCommentsPagination(data.commentsPagination);
  };

      const submitComment = async () => {
        if (!canComment) return;
        if (postingComment) return;

        const body = commentBody.trim();
        if (!body) return;

        setPostingComment(true);
        try {
          const res = await fetch(`/api/pets/${encodeURIComponent(petId)}/comments`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ body }),
          });
          if (!res.ok) throw new Error(`Pet comment create failed: ${res.status}`);

          setCommentBody('');

          const data = await fetchPetShow(petId, 1);
          setPet(data.pet);
          setPosts(data.posts ?? []);
          setComments(data.comments ?? []);
          setCommentsPagination(data.commentsPagination);
        } finally {
          setPostingComment(false);
        }
      };

      const likeComment = async (commentId: number | string, likedByMe?: boolean) => {
        if (!isAuthed) return;
        if (!canLikeComments) return;
        if (likedByMe) return;

        const key = String(commentId);
        if (likingCommentIds[key]) return;

        setLikingCommentIds((prev) => ({ ...prev, [key]: true }));
        try {
          const res = await fetch(`/api/comments/${encodeURIComponent(key)}/likes`, { method: 'POST' });

          if (res.status === 403) return;
          if (!res.ok) throw new Error(`Comment like failed: ${res.status}`);

          const data = (await res.json()) as { liked: boolean; likes_count: number };

      const apply = (items: CommentModel[]): CommentModel[] =>
        items.map((c) => {
          const result: CommentModel = {
            id: c.id,
            body: c.body,
            created_at: c.created_at,
            likes_count: String(c.id) === key ? data.likes_count : c.likes_count,
            liked_by_me: String(c.id) === key ? true : c.liked_by_me,
            user: c.user,
            children: c.children && c.children.length > 0 ? apply(c.children) : undefined,
          };
          return result;
        });

          setComments((prev) => apply(prev));
        } finally {
          setLikingCommentIds((prev) => ({ ...prev, [key]: false }));
        }
      };

      const submitReply = async (parentId: number | string, body: string) => {
        if (!isAuthed) return;

        const key = String(parentId);
        if (replyingCommentIds[key]) return;

        const trimmed = body.trim();
        if (!trimmed) return;

        setReplyingCommentIds((prev) => ({ ...prev, [key]: true }));
        try {
          const res = await fetch(`/api/pets/${encodeURIComponent(petId)}/comments`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ body: trimmed, parent_id: parentId }),
          });
          if (!res.ok) throw new Error(`Reply failed: ${res.status}`);

          const data = await fetchPetShow(petId, 1);
          setPet(data.pet);
          setPosts(data.posts ?? []);
          setComments(data.comments ?? []);
          setCommentsPagination(data.commentsPagination);
        } finally {
          setReplyingCommentIds((prev) => ({ ...prev, [key]: false }));
        }
      };

  if (bootLoading) {
    return (
      <main className="op-container-narrow py-8">
        <div className="op-card p-6 text-center text-sm text-gray-600">Načítám…</div>
      </main>
    );
  }

  if (!pet) {
    return (
      <main className="op-container-narrow py-8">
        <div className="op-card p-6 text-center text-sm text-gray-600">Mazlíček nenalezen.</div>
      </main>
    );
  }

  const profileSrc = toPetImageSrc(pet.profile_picture);

  return (
    <main className="op-container-narrow py-8">
      <section className="overflow-hidden op-card">
        <div className="p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                {profileSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profileSrc} alt={pet.name} className="h-full w-full object-cover" />
                ) : null}
              </div>

              <div>
                <div className="text-xl font-bold text-gray-900">{pet.name}</div>
                <div className="mt-1 text-sm text-gray-600">Plemeno: {pet.breed?.name ?? 'Neznámé plemeno'}</div>
                <div className="mt-0.5 text-sm text-gray-800">Bio: {pet.bio ?? 'Bez bio'}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">{formatLikesCS(pet.likes_count)}</div>
              <div className="text-sm text-gray-600">{formatFollowersCS(pet.followers_count)}</div>
              <div className="text-sm text-gray-600">{formatCommentsCS(pet.comments_count ?? 0)}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryButton
              onClick={toggleFollow}
              disabled={!isAuthed || following || (!Boolean(pet.followed_by_me) && !Boolean(pet.can_follow))}
            >
              {Boolean(pet.followed_by_me)
                ? following
                  ? 'Odebírám…'
                  : 'Ukončit sledování'
                : following
                  ? 'Sleduji…'
                  : Boolean(pet.can_follow)
                    ? 'Sleduj'
                    : 'Sleduj'}
            </PrimaryButton>

            <PrimaryButton onClick={likePet} disabled={!isAuthed || likingPet || Boolean(pet.liked_by_me) || !Boolean(pet.can_like)}>
              {Boolean(pet.liked_by_me) ? 'Olajkováno' : likingPet ? 'Lajkuji…' : Boolean(pet.can_like) ? 'Lajkovat' : 'Lajkovat'}
            </PrimaryButton>
          </div>
        </div>
      </section>

      <div className="mt-4 op-card p-6">
        <div className="text-sm font-semibold text-gray-900">Komentáře</div>

        <div className="mt-3">
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            rows={3}
            placeholder={canComment ? 'Napiš komentář…' : 'Pro komentování se přihlaš.'}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            disabled={!canComment || postingComment}
            maxLength={1000}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">{commentBody.trim().length}/1000</div>
            <PrimaryButton onClick={submitComment} disabled={!canComment || postingComment || commentBody.trim().length === 0}>
              {postingComment ? 'Odesílám…' : 'Odeslat'}
            </PrimaryButton>
          </div>
        </div>

        <div className="mt-4">
          <CommentsThread
            comments={comments}
            likingCommentIds={likingCommentIds}
            replyingCommentIds={replyingCommentIds}
            isAuthed={isAuthed}
            canLike={canLikeComments}
            currentUserId={currentUserId}
            onLike={likeComment}
            onReply={submitReply}
          />
        </div>

        {canLoadMoreComments ? (
          <div className="mt-4">
            <PrimaryButton onClick={loadMoreComments}>Načíst další</PrimaryButton>
          </div>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-extrabold tracking-tight">Příspěvky</h2>

        {posts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Zatím bez postů.</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post: PostCardModel) => (
              <PostCard key={String(post.id)} post={post} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}