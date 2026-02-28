import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TipCard from '@/components/onlypaws/TipCard';

describe('TipCard', () => {
  it('renders tip heading and content', () => {
    render(<TipCard />);
    expect(screen.getByText('Tip')).toBeInTheDocument();
    expect(screen.getByText(/premium příspěvky se odemykají/i)).toBeInTheDocument();
  });
});

