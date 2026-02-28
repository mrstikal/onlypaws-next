import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecommendedPetsCard from '@/components/onlypaws/RecommendedPetsCard';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  ),
}));

describe('RecommendedPetsCard', () => {
  it('renders list of recommended pets with followers count', () => {
    const pets = [
      { id: '1', name: 'Micka', slug: 'micka', followers_count: 10 },
      { id: '2', name: 'Alik', slug: 'alik', followers_count: 5 },
    ];

    render(<RecommendedPetsCard pets={pets} />);
    expect(screen.getByText('Doporučení Mazlíčci')).toBeInTheDocument();
    expect(screen.getByText('Micka')).toBeInTheDocument();
    expect(screen.getByText('10 sledujících')).toBeInTheDocument();
    expect(screen.getByText('Alik')).toBeInTheDocument();
    expect(screen.getByText('5 sledujících')).toBeInTheDocument();
  });
});

