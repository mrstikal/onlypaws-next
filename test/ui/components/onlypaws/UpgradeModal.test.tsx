import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpgradeModal from '@/components/onlypaws/UpgradeModal';

vi.mock('@/components/ui/Modal', () => ({
  default: ({ show, children }: { show: boolean; children: unknown }) =>
    show ? <div data-testid="modal">{children as never}</div> : null,
}));

vi.mock('@/components/ui/PrimaryButton', () => ({
  default: ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: unknown }) => (
    <button onClick={onClick} disabled={disabled}>
      {children as never}
    </button>
  ),
}));

vi.mock('@/components/ui/SecondaryButton', () => ({
  default: ({ onClick, children }: { onClick: () => void; children: unknown }) => (
    <button onClick={onClick}>{children as never}</button>
  ),
}));

describe('UpgradeModal', () => {
  const tiers = [
    { id: '1', name: 'Free', slug: 'free' as const, price_monthly: 0, description: 'Zdarma' },
    { id: '2', name: 'Basic', slug: 'basic' as const, price_monthly: 99, description: 'Základní' },
    { id: '3', name: 'VIP', slug: 'vip' as const, price_monthly: 199, description: 'Premium' },
  ];

  it('renders when open is true', () => {
    render(<UpgradeModal open onClose={vi.fn()} tiers={tiers} viewerTierSlug="free" />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Změnit tarif (demo)')).toBeInTheDocument();
  });

  it('renders all tiers with pricing', () => {
    render(<UpgradeModal open onClose={vi.fn()} tiers={tiers} viewerTierSlug="free" />);
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getAllByText('Zdarma')).toHaveLength(2); // price + description
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('99 granulí / měs.')).toBeInTheDocument();
  });

  it('marks current tier as active', () => {
    render(<UpgradeModal open onClose={vi.fn()} tiers={tiers} viewerTierSlug="basic" />);
    expect(screen.getByRole('button', { name: 'Aktuální tarif' })).toBeDisabled();
  });

  it('calls onClose when secondary button is clicked', async () => {
    const onClose = vi.fn();
    render(<UpgradeModal open onClose={onClose} tiers={tiers} viewerTierSlug="free" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Zavřít' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onChooseTier when authenticated user chooses a tier', async () => {
    const onChooseTier = vi.fn();
    const onClose = vi.fn();
    render(
      <UpgradeModal
        open
        onClose={onClose}
        tiers={tiers}
        viewerTierSlug="free"
        isAuthed
        onChooseTier={onChooseTier}
      />
    );
    const user = userEvent.setup();

    const [firstZvolit] = screen.getAllByRole('button', { name: 'Zvolit' });
    expect(firstZvolit).toBeDefined();
    await user.click(firstZvolit!);

    await waitFor(() => {
      expect(onChooseTier).toHaveBeenCalledWith('basic');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls onRequireAuth when unauthenticated user chooses a tier', async () => {
    const onRequireAuth = vi.fn();
    const onClose = vi.fn();
    render(
      <UpgradeModal
        open
        onClose={onClose}
        tiers={tiers}
        viewerTierSlug="free"
        isAuthed={false}
        onRequireAuth={onRequireAuth}
      />
    );
    const user = userEvent.setup();

    const [firstZvolit] = screen.getAllByRole('button', { name: 'Zvolit' });
    expect(firstZvolit).toBeDefined();
    await user.click(firstZvolit!);

    await waitFor(() => {
      expect(onRequireAuth).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});

