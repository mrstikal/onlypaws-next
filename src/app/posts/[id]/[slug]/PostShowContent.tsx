'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { formatLikesCS, formatCommentsCS } from '@/utils/pluralize';
import LikersPanel from '@/components/onlypaws/LikersPanel';
import CommentsThread from '@/components/onlypaws/CommentsThread';
import { useDeterministicRootComments } from '@/components/ui/useDeterministicRootComments';
import PrimaryButton from '@/components/ui/PrimaryButton';

type CommentNode = {
  id: number;
  body: string;
  likes_count: number;
  liked_by_me: boolean;
  created_at: string | null;
  user: { id: string; name: string } | null;
  children: CommentNode[];
};

interface PostShowContentProps {
  id: string;
  slug: string;
  post: {
    id: string;
    slug: string;
    caption?: string;
    media_url: string;
    is_premium: boolean;
    locked: boolean;
    likes_count: number;
    liked_by_me: boolean;
    can_like: boolean;
    comments_count: number;
    pet?: { id: string; name: string };
    required_tier?: { name: string } | null;
    required_tier_slug: string;
    likers?: Array<{ id: number; name: string }>;
  };
  comments: CommentNode[];
  commentsPagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };

  isAuthed: boolean;
  currentUserId?: string | null;
  canLikeComments: boolean;
}

function patchLikeInTree(nodes: CommentNode[], commentId: number, likesCount: number): CommentNode[] {
  return nodes.map((n) => {
    if (n.id === commentId) return { ...n, liked_by_me: true, likes_count: likesCount };
    if (n.children?.length) return { ...n, children: patchLikeInTree(n.children, commentId, likesCount) };
    return n;
  });
}

export default function PostShowContent({
  id,
  post,
  comments,
  commentsPagination,
  isAuthed,
  currentUserId,
  canLikeComments,
}: PostShowContentProps) {
  const [postState, setPostState] = useState(post);

  const [likingPost, setLikingPost] = useState(false);
  const [showLikers, setShowLikers] = useState(false);

  const [likers, setLikers] = useState<Array<{ id: number; name: string }>>(postState.likers ?? []);
  const [loadingLikers, setLoadingLikers] = useState(false);

  const [likingCommentIds, setLikingCommentIds] = useState<Record<number | string, boolean>>({});
  const [replyingCommentIds, setReplyingCommentIds] = useState<Record<number | string, boolean>>({});

  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const root = useDeterministicRootComments<CommentNode>({
    entityKey: `post:${id}`,
    comments,
    pagination: commentsPagination,
    loadPage: async (page: number) => {
      const sp = new URLSearchParams();
      sp.set('cpage', String(page));
      sp.set('per_page', String(commentsPagination.per_page));

      const res = await fetch(`/api/posts/${id}/comments?${sp.toString()}`, { method: 'GET' });
      if (!res.ok) throw new Error(`Comments load failed: ${res.status}`);

      return (await res.json()) as {
        comments: CommentNode[];
        commentsPagination: {
          current_page: number;
          last_page: number;
          per_page: number;
          total: number;
        };
      };
    },
  });

  const handleLikePost = async () => {
    if (!isAuthed) return;
    if (!postState.can_like) return;
    if (likingPost || postState.liked_by_me) return;

    setLikingPost(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(id)}/likes`, { method: 'POST' });

      if (res.status === 403) return;
      if (!res.ok) throw new Error(`Like post failed: ${res.status}`);

      const data = (await res.json()) as { liked: boolean; likes_count: number };

      setPostState((prev) => ({
        ...prev,
        liked_by_me: Boolean(data.liked),
        likes_count: data.likes_count ?? prev.likes_count,
      }));
    } finally {
      setLikingPost(false);
    }
  };

  const likersText = useMemo(() => {
    const names = (likers ?? []).map((u) => u.name).filter(Boolean);
    return names.join(', ');
  }, [likers]);

  const handleToggleLikers = async () => {
    const next = !showLikers;
    setShowLikers(next);

    if (!next) return;
    if (likers.length > 0) return;
    if (loadingLikers) return;

    setLoadingLikers(true);
    try {
      const res = await fetch(`/api/posts/${id}/likers`, { method: 'GET' });
      if (!res.ok) throw new Error(`Likers load failed: ${res.status}`);

      const data = (await res.json()) as { likers: Array<{ id: number; name: string }> };
      setLikers(data.likers ?? []);
    } finally {
      setLoadingLikers(false);
    }
  };

  const handleLikeComment = async (commentId: number | string, likedByMe?: boolean) => {
    const numericId = typeof commentId === 'number' ? commentId : Number.parseInt(String(commentId), 10);
    if (!Number.isFinite(numericId)) return;

    if (!isAuthed) return;
    if (!canLikeComments) return;
    if (likedByMe || likingCommentIds[numericId]) return;

    setLikingCommentIds((prev) => ({ ...prev, [numericId]: true }));
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(String(numericId))}/likes`, { method: 'POST' });

      if (res.status === 403) return;
      if (!res.ok) throw new Error(`Like failed: ${res.status}`);

      const data = (await res.json()) as { liked: boolean; likes_count: number };

      const patchedRoots = patchLikeInTree(root.items as CommentNode[], numericId, data.likes_count);
      root.applyIncomingRootPage(root.page, patchedRoots);
    } finally {
      setLikingCommentIds((prev) => ({ ...prev, [numericId]: false }));
    }
  };

  const reloadFirstCommentsPage = async () => {
    const sp = new URLSearchParams();
    sp.set('cpage', '1');
    sp.set('per_page', String(commentsPagination.per_page));

    const res = await fetch(`/api/posts/${id}/comments?${sp.toString()}`, { method: 'GET' });
    if (!res.ok) throw new Error(`Comments reload failed: ${res.status}`);

    const data = (await res.json()) as {
      comments: CommentNode[];
      commentsPagination: { current_page: number; last_page: number; per_page: number; total: number };
    };

    root.applyIncomingRootPage(1, data.comments);
    root.setPage(data.commentsPagination.current_page ?? 1);
    root.setLastPage(data.commentsPagination.last_page ?? 1);
  };

  const handleSubmitComment = async () => {
    if (!isAuthed) return;

    const body = commentBody.trim();
    if (!body || postingComment) return;

    setPostingComment(true);
    try {
      const res = await fetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error(`Comment create failed: ${res.status}`);

      const data = (await res.json()) as { comments_count?: number };

      setPostState((prev) => ({
        ...prev,
        comments_count: typeof data.comments_count === 'number' ? data.comments_count : prev.comments_count + 1,
      }));

      setCommentBody('');
      await reloadFirstCommentsPage();
    } finally {
      setPostingComment(false);
    }
  };

  const handleSubmitReply = async (parentId: number | string, body: string) => {
    const key = String(parentId);
    if (!isAuthed || replyingCommentIds[key]) return;

    setReplyingCommentIds((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, parent_id: parentId }),
      });
      if (!res.ok) throw new Error(`Reply create failed: ${res.status}`);

      const data = (await res.json()) as { comments_count?: number };

      setPostState((prev) => ({
        ...prev,
        comments_count: typeof data.comments_count === 'number' ? data.comments_count : prev.comments_count + 1,
      }));

      await reloadFirstCommentsPage();
    } finally {
      setReplyingCommentIds((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div>
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="relative">
          <Image
            src={postState.media_url}
            alt={post.caption ?? 'Post'}
            className={['h-130 w-full object-cover', postState.locked ? 'blur-sm' : ''].join(' ')}
            width={800}
            height={520}
          />
        </div>

        <div className="p-6">
          <div className="mt-4">
            <LikersPanel
              likesLabel={formatLikesCS(postState.likes_count)}
              commentsLabel={formatCommentsCS(postState.comments_count)}
              showLikers={showLikers}
              onToggle={handleToggleLikers}
              likersText={likersText}
              likersCount={likers.length}
              loadingLikers={loadingLikers}
              onLikePost={handleLikePost}
              likedByMe={postState.liked_by_me}
              likingPost={likingPost}
              canLike={postState.can_like}
            />
          </div>

          <section className="mt-8">
            <div className="mt-4">
              <CommentsThread
                comments={root.items}
                likingCommentIds={likingCommentIds}
                replyingCommentIds={replyingCommentIds}
                isAuthed={isAuthed}
                canLike={canLikeComments}
                currentUserId={currentUserId ?? null}
                onLike={handleLikeComment}
                onReply={handleSubmitReply}
              />
            </div>

            {isAuthed ? (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
                <label className="block text-sm font-semibold text-gray-900" htmlFor="new-comment">
                  Přidat komentář
                </label>

                <textarea
                  id="new-comment"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none focus:border-gray-300 focus:ring-0"
                  rows={3}
                  maxLength={1000}
                  placeholder="Napiš něco hezkého…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  disabled={postingComment}
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500">{commentBody.trim().length}/1000</div>

                  <PrimaryButton onClick={handleSubmitComment} disabled={postingComment || commentBody.trim().length === 0}>
                    {postingComment ? 'Odesílám…' : 'Odeslat'}
                  </PrimaryButton>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </div>
  );
}