import Link from 'next/link';
import Image from 'next/image';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { formatLikesCS, formatCommentsCS } from '@/utils/pluralize';
import { slugify } from '@/utils/slugify';
import { useUpgrade } from '@/components/onlypaws/UpgradeContext';
import { useOnlyPawsPageDataOptional } from '@/components/onlypaws/OnlyPawsPageDataContext';

type TierSlug = 'free' | 'basic' | 'vip' | 'ultra';

export type PostCardModel = {
  id: string | number | bigint;
  caption: string | null;
  media_url: string;
  likes_count: number;
  comments_count: number;
  is_premium: boolean;
  locked: boolean;
  created_at: string | null;

  pet: { name: string } | null;

  required_tier: { name: string } | null;
  required_tier_slug: TierSlug | string;

  slug?: string;
};

type Props = {
  post: PostCardModel;
  onUpgradeClick?: () => void;
};

function toIdString(id: PostCardModel['id']) {
  return typeof id === 'bigint' ? id.toString() : String(id);
}

function toMediaSrc(mediaUrl: string) {
  if (!mediaUrl) return mediaUrl;
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) return mediaUrl;
  if (mediaUrl.startsWith('/')) return mediaUrl;
  return `/${mediaUrl}`;
}

function buildPostSlug(post: PostCardModel) {
  const idStr = toIdString(post.id);
  const base = `${post.pet?.name ?? 'pet'} ${post.caption ?? 'post'} ${idStr}`;
  return slugify(base) || `post-${idStr}`;
}

function tierRank(slug: string): number {
  const order: Record<TierSlug, number> = { free: 0, basic: 1, vip: 2, ultra: 3 };
  const s = (slug as TierSlug) in order ? (slug as TierSlug) : 'free';
  return order[s];
}

export default function PostCard({ post, onUpgradeClick }: Props) {
  const upgrade = useUpgrade();
  const pageData = useOnlyPawsPageDataOptional();

  const viewerTierSlug = pageData?.viewerTierSlug ?? 'free';

  const computedLocked =
    Boolean(post.is_premium) && tierRank(String(viewerTierSlug)) < tierRank(String(post.required_tier_slug));

  const effectiveLocked = computedLocked || Boolean(post.locked);

  const handleUpgradeClick = () => {
    if (onUpgradeClick) return onUpgradeClick();
    upgrade?.openUpgrade?.();
  };

  const createdAtLabel = (() => {
    if (!post.created_at) return null;

    const d = new Date(post.created_at);
    if (Number.isNaN(d.getTime())) return null;

    return new Intl.DateTimeFormat('cs-CZ', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  })();

  const idStr = toIdString(post.id);
  const expectedSlug = buildPostSlug(post);
  const href = `/posts/${idStr}/${expectedSlug}`;

  const mediaSrc = toMediaSrc(post.media_url);

  const CardInner = (
    <>
      <div className="relative">
        <Image
          src={mediaSrc}
          alt={post.caption ?? 'Post'}
          className={['h-64 w-full object-cover', effectiveLocked ? 'blur-sm' : ''].join(' ')}
          width={400}
          height={256}
          loading="lazy"
        />

        {post.is_premium ? (
          <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
            Premium · {post.required_tier?.name ?? post.required_tier_slug}
          </div>
        ) : (
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-900">
            Free
          </div>
        )}

        {effectiveLocked ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-6">
            <div className="w-full max-w-sm rounded-xl bg-white p-4 text-center shadow">
              <div className="text-sm font-semibold text-gray-900">
                Zamčeno - potřebný Tarif: {post.required_tier?.name ?? post.required_tier_slug}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Navýšení Tarifu odemkne premium příspěvky napříč všemi Mazlíčky (demo).
              </div>

              {onUpgradeClick || upgrade?.openUpgrade ? (
                <div className="mt-3">
                  <PrimaryButton
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUpgradeClick();
                    }}
                  >
                    Navýšit Tarif (demo)
                  </PrimaryButton>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-rose-700">{post.pet?.name ?? 'Unknown Pet'}</div>

            {createdAtLabel ? (
              <time
                className="mt-0.5 block text-xs text-gray-500"
                dateTime={post.created_at ?? undefined}
                title={post.created_at ?? undefined}
              >
                {createdAtLabel}
              </time>
            ) : null}
          </div>

          <div className="mt-1 text-xs text-gray-600">
            {formatLikesCS(post.likes_count ?? 0)} · {formatCommentsCS(post.comments_count ?? 0)}
          </div>
        </div>

        {post.caption ? (
          <p className="mt-2 line-clamp-2 text-sm text-gray-700">{post.caption}</p>
        ) : (
          <p className="mt-2 text-sm text-gray-400">Bez popisku</p>
        )}
      </div>
    </>
  );

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {effectiveLocked ? (
        <div className="block">{CardInner}</div>
      ) : (
        <Link href={href} className="block">
          {CardInner}
        </Link>
      )}
    </article>
  );
}
