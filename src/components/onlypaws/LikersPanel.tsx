'use client';

import Image from 'next/image';

type Props = {
  likesLabel: string;
  commentsLabel: string;
  showLikers: boolean;
  onToggle: () => void;
  likersText: string;
  likersCount: number;
  loadingLikers?: boolean;
  likedByMe: boolean;
  likingPost: boolean;
  onLikePost: () => void;
  canLike?: boolean;
};

export default function LikersPanel({
  likesLabel,
  commentsLabel,
  showLikers,
  onToggle,
  likersText,
  likersCount,
  loadingLikers = false,
  likedByMe,
  likingPost,
  onLikePost,
  canLike = true,
}: Props) {
  return (
    <div className="mt-1 flex flex-col gap-2">
      <div className="inline-flex items-center gap-2 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1">
          {likesLabel}
          <button
            type="button"
            className="inline-flex items-center rounded p-1 hover:bg-gray-100"
            aria-expanded={showLikers}
            aria-label={showLikers ? 'Skrýt likery' : 'Zobrazit likery'}
            onClick={onToggle}
          >
            <Image
              src={showLikers ? '/images/chevron-up.svg' : '/images/chevron-down.svg'}
              alt=""
              width={16}
              height={16}
              className="h-4 w-3"
            />
          </button>
        </span>

        <span>· {commentsLabel}</span>

        <button
          type="button"
          className="ml-2 op-action-xs"
          onClick={onLikePost}
          disabled={!canLike || likingPost || likedByMe}
          aria-label="Like post"
          title={!canLike ? 'Lajkování není povoleno.' : likedByMe ? 'Už jsi to olajkoval/a.' : undefined}
        >
          {likedByMe ? 'Olajkováno' : likingPost ? 'Lajkuji…' : canLike ? 'Lajkovat' : 'Lajkovat'}
        </button>
      </div>

      {showLikers ? (
        <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-700">
          {loadingLikers ? (
            <div className="text-gray-500">Načítám…</div>
          ) : likersCount > 0 ? (
            <div className="whitespace-pre-wrap">
              <span className="font-semibold text-gray-900">Likeři:</span> {likersText}
            </div>
          ) : (
            <div className="text-gray-500">Zatím bez likerů.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

