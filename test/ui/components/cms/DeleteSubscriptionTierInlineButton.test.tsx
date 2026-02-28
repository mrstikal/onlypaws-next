import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteSubscriptionTierInlineButton from '@/components/cms/DeleteSubscriptionTierInlineButton';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

global.fetch = vi.fn();
global.confirm = vi.fn();

describe('DeleteSubscriptionTierInlineButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders delete button', () => {
    render(<DeleteSubscriptionTierInlineButton tierId="1" />);

    expect(screen.getByRole('button', { name: 'Smazat' })).toBeInTheDocument();
  });

  it('asks for confirmation and skips API call when cancelled', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    render(<DeleteSubscriptionTierInlineButton tierId="1" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    expect(global.confirm).toHaveBeenCalledWith('Opravdu smazat tento tier?');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls DELETE API and refreshes on success', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<DeleteSubscriptionTierInlineButton tierId="1" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cms/subscription-tiers/1', { method: 'DELETE' });
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('displays error message when delete fails', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Cannot delete tier' }),
    });

    render(<DeleteSubscriptionTierInlineButton tierId="2" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(screen.getByText('Cannot delete tier')).toBeInTheDocument();
    });
  });

  it('re-enables button after request completes', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<DeleteSubscriptionTierInlineButton tierId="3" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Smazat' })).toBeEnabled();
    });
  });
});

