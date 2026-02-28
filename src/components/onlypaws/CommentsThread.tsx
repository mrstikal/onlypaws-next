'use client';

import React, { useMemo, useState } from 'react';
import { formatLikesCS } from '@/utils/pluralize';

export type CommentModel = {
  id: number | string;
  body: string;
  likes_count: number;
  liked_by_me?: boolean;
  created_at: string | null;
  user: { id: number | string; name: string } | null;
  children?: CommentModel[];
};

type Props = {
  comments: CommentModel[];
  likingCommentIds: Record<number | string, boolean>;
  replyingCommentIds: Record<number | string, boolean>;
  isAuthed: boolean;

  canLike?: boolean;
  currentUserId?: number | string | null;

  onLike: (commentId: number | string, likedByMe?: boolean) => void | Promise<void>;
  onReply: (parentId: number | string, body: string) => void | Promise<void>;
};

function ReplyForm({
                     open,
                     disabled,
                     value,
                     onChange,
                     onCancel,
                     onSubmit,
                   }: {
  open: boolean;
  disabled: boolean;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <textarea
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none focus:border-gray-300 focus:ring-0"
        rows={3}
        maxLength={1000}
        placeholder="Napiš odpověď…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500">{value.trim().length}/1000</div>

        <div className="flex items-center gap-2">
          <button type="button" className="text-xs text-gray-600 hover:text-gray-900" onClick={onCancel} disabled={disabled}>
            Zrušit
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || value.trim().length === 0}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {disabled ? 'Odesílám…' : 'Odeslat'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentNode({
                       comment,
                       depth,
                       isAuthed,
                       canLike,
                       likingCommentIds,
                       replyingCommentIds,
                       replyingToId,
                       replyBody,
                       onToggleReply,
                       onReplyBodyChange,
                       onReplySubmit,
                       onLike,
                       currentUserId,
                     }: {
  comment: CommentModel;
  depth: number;
  isAuthed: boolean;
  canLike: boolean;
  likingCommentIds: Record<number | string, boolean>;
  replyingCommentIds: Record<number | string, boolean>;
  replyingToId: number | string | null;
  replyBody: string;
  onToggleReply: (commentId: number | string) => void;
  onReplyBodyChange: (v: string) => void;
  onReplySubmit: (commentId: number | string) => void;
  onLike: (commentId: number | string, likedByMe?: boolean) => void | Promise<void>;
  currentUserId?: number | string | null;
}) {
  const isReplyOpen = replyingToId === comment.id;
  const isPostingReply = !!replyingCommentIds[comment.id];

  const isOwnComment =
    currentUserId != null && comment.user?.id != null && String(comment.user.id) === String(currentUserId);

  const likeDisabled = !isAuthed || !canLike || isOwnComment || !!likingCommentIds[comment.id] || !!comment.liked_by_me;

  return (
    <div className={depth > 0 ? 'border-l border-gray-200 pl-4' : ''}>
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-900">{comment.user?.name ?? 'Unknown User'}</div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-600">{formatLikesCS(comment.likes_count)}</div>
            <button
              type="button"
              className="op-action-xs"
              onClick={() => onLike(comment.id, comment.liked_by_me)}
              disabled={likeDisabled}
              aria-label="Like comment"
            >
              {comment.liked_by_me
                ? 'Olajkováno'
                : likingCommentIds[comment.id]
                  ? '…'
                  : canLike
                    ? 'Lajkovat'
                    : 'Lajkovat (zakázáno)'}
            </button>
          </div>
        </div>

        <div className="mt-2 text-sm text-gray-800">{comment.body}</div>

        {isAuthed ? (
          <div className="mt-3">
            <button type="button" className="op-action-xs" onClick={() => onToggleReply(comment.id)} disabled={isPostingReply}>
              Odpovědět
            </button>

            <ReplyForm
              open={Boolean(isReplyOpen)}
              disabled={isPostingReply}
              value={replyBody}
              onChange={onReplyBodyChange}
              onCancel={() => onToggleReply(comment.id)}
              onSubmit={() => onReplySubmit(comment.id)}
            />
          </div>
        ) : null}
      </div>

      {comment.children && comment.children.length > 0 ? (
        <div className="mt-3 space-y-3">
          {comment.children.map((child) => (
            <CommentNode
              key={String(child.id)}
              comment={child}
              depth={depth + 1}
              isAuthed={isAuthed}
              canLike={canLike}
              likingCommentIds={likingCommentIds}
              replyingCommentIds={replyingCommentIds}
              replyingToId={replyingToId}
              replyBody={replyBody}
              onToggleReply={onToggleReply}
              onReplyBodyChange={onReplyBodyChange}
              onReplySubmit={onReplySubmit}
              onLike={onLike}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CommentsThread({
                                         comments,
                                         likingCommentIds,
                                         replyingCommentIds,
                                         isAuthed,
                                         canLike = true,
                                         currentUserId,
                                         onLike,
                                         onReply,
                                       }: Props) {
  const [replyingToId, setReplyingToId] = useState<number | string | null>(null);
  const [replyBody, setReplyBody] = useState('');

  const isPostingCurrentReply = useMemo(() => {
    if (replyingToId === null) return false;
    return !!replyingCommentIds[replyingToId];
  }, [replyingToId, replyingCommentIds]);

  const toggleReply = (commentId: number | string) => {
    if (!isAuthed) return;
    setReplyingToId((prev) => (prev === commentId ? null : commentId));
    setReplyBody('');
  };

  const submitReplyFor = (commentId: number | string) => {
    if (!isAuthed) return;
    if (isPostingCurrentReply) return;

    const body = replyBody.trim();
    if (!body) return;

    onReply(commentId, body);

    setReplyingToId(null);
    setReplyBody('');
  };

  if (comments.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
        Zatím bez komentářů.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((c) => (
        <CommentNode
          key={String(c.id)}
          comment={c}
          depth={0}
          isAuthed={isAuthed}
          canLike={canLike}
          likingCommentIds={likingCommentIds}
          replyingCommentIds={replyingCommentIds}
          replyingToId={replyingToId}
          replyBody={replyBody}
          onToggleReply={toggleReply}
          onReplyBodyChange={setReplyBody}
          onReplySubmit={submitReplyFor}
          onLike={onLike}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}