import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SecondaryButton from '@/components/ui/SecondaryButton';

describe('PrimaryButton', () => {
  it('renders children text', () => {
    render(<PrimaryButton>Click Me</PrimaryButton>);
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('applies disabled state and opacity class', () => {
    render(<PrimaryButton disabled>Disabled</PrimaryButton>);
    const btn = screen.getByRole('button', { name: 'Disabled' });
    expect(btn).toBeDisabled();
    expect(btn.className).toContain('opacity-25');
  });
});

describe('SecondaryButton', () => {
  it('renders children text', () => {
    render(<SecondaryButton>Cancel</SecondaryButton>);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('defaults to type=button', () => {
    render(<SecondaryButton>Test</SecondaryButton>);
    expect(screen.getByRole('button', { name: 'Test' })).toHaveAttribute('type', 'button');
  });
});

