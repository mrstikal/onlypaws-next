import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostCard from '@/components/onlypaws/PostCard';

const mockPost = {
  id: '101',
  caption: 'Beautiful day',
  media_url: '/media/posts/101.jpg',
  likes_count: 12,
  comments_count: 3,
  is_premium: false,
  locked: false,
  created_at: '2026-03-01T10:00:00Z',
  pet: { name: 'Micka' },
  required_tier: null,
  required_tier_slug: 'free',
};

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} style={{ width: '100%', height: 'auto' }} />
  ),
}));

describe('PostCard', () => {
  it('renders post with pet name and counts', () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText('Micka')).toBeInTheDocument();
    expect(screen.getByText(/12 lajků/i)).toBeInTheDocument();
    expect(screen.getByText(/3 komentáře/i)).toBeInTheDocument();
    expect(screen.getByText('Beautiful day')).toBeInTheDocument();
  });

  it('marks post as free when not premium', () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('marks post as premium and shows tier', () => {
    const premiumPost = {
      ...mockPost,
      is_premium: true,
      required_tier: { name: 'Basic' },
      required_tier_slug: 'basic',
    };
    render(<PostCard post={premiumPost} />);
    expect(screen.getByText(/premium.*basic/i)).toBeInTheDocument();
  });
});
