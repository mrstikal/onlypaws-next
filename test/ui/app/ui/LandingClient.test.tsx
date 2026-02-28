import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingClient from '@/app/ui/LandingClient';

const mockUseUpgrade = vi.fn();
const mockUseOnlyPawsPageData = vi.fn();

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) => (
    <a href={href} {...rest}>
      {children as never}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...rest} style={{ width: '100%', height: 'auto' }} />
  ),
}));

vi.mock('@/components/onlypaws/PostCard', () => ({
  default: ({ post, onUpgradeClick }: { post: { id: string }; onUpgradeClick?: () => void }) => (
    <div data-testid="post-card">
      <span>Post {post.id}</span>
      <button onClick={onUpgradeClick} type="button">
        Upgrade
      </button>
    </div>
  ),
}));

vi.mock('@/components/onlypaws/UpgradeContext', () => ({
  useUpgrade: () => mockUseUpgrade(),
}));

vi.mock('@/components/onlypaws/OnlyPawsPageDataContext', () => ({
  useOnlyPawsPageData: () => mockUseOnlyPawsPageData(),
}));

const baseProps = {
  topPets: [
    {
      id: 'p1',
      name: 'Micka',
      slug: 'micka',
      profile_picture: null,
      followers_count: 12,
      posts_count: 3,
    },
  ],
  trendingPosts: [
    {
      id: '101',
      caption: 'Prvni post',
      media_url: '/media/posts/101.jpg',
      likes_count: 3,
      comments_count: 1,
      is_premium: false,
      locked: false,
      created_at: null,
      pet: { name: 'Micka' },
      required_tier: null,
      required_tier_slug: 'free',
    },
    {
      id: '102',
      caption: 'Druhy post',
      media_url: '/media/posts/102.jpg',
      likes_count: 5,
      comments_count: 2,
      is_premium: true,
      locked: true,
      created_at: null,
      pet: { name: 'Alik' },
      required_tier: { name: 'Basic' },
      required_tier_slug: 'basic',
    },
  ],
};

beforeEach(() => {
  mockUseUpgrade.mockReturnValue({ openUpgrade: vi.fn() });
  mockUseOnlyPawsPageData.mockReturnValue({
    tiers: [
      { id: 1, slug: 'free', name: 'Free', price_monthly: 0, description: 'Zdarma' },
      { id: 2, slug: 'basic', name: 'Basic', price_monthly: 99, description: 'Zaklad' },
    ],
    viewerTierSlug: 'basic',
    isAuthed: true,
  });
});

describe('LandingClient', () => {
  it('vykresli hlavni sekce a top mazlicka', () => {
    render(<LandingClient {...baseProps} />);

    expect(screen.getByRole('heading', { name: /jedno předplatné/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /top mazlíčci/i })).toBeInTheDocument();
    expect(screen.getByText('Micka')).toBeInTheDocument();
  });

  it('oznaci aktualni tarif a zobrazi post cards na obou sekcich', () => {
    render(<LandingClient {...baseProps} />);

    expect(screen.getByText('Tvůj tarif')).toBeInTheDocument();
    expect(screen.getAllByTestId('post-card')).toHaveLength(4);
  });

  it('spusti upgrade akci po kliknuti', () => {
    const openUpgrade = vi.fn();
    mockUseUpgrade.mockReturnValue({ openUpgrade });

    render(<LandingClient {...baseProps} />);

    const firstUpgradeButton = screen.getAllByRole('button', { name: 'Upgrade' })[0]!;
    fireEvent.click(firstUpgradeButton);
    expect(openUpgrade).toHaveBeenCalledTimes(1);
  });
});
