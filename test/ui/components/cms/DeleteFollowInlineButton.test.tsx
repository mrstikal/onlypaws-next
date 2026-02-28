import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteFollowInlineButton from '@/components/cms/DeleteFollowInlineButton';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

global.fetch = vi.fn();
global.confirm = vi.fn();

describe('DeleteFollowInlineButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders delete button', () => {
    render(<DeleteFollowInlineButton followId="3" />);

    expect(screen.getByRole('button', { name: 'Smazat' })).toBeInTheDocument();
  });

  it('asks for confirmation and skips API call when cancelled', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    render(<DeleteFollowInlineButton followId="3" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    expect(global.confirm).toHaveBeenCalledWith('Opravdu smazat toto sledování?');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls DELETE API and refreshes on success', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<DeleteFollowInlineButton followId="3" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cms/follows/3', { method: 'DELETE' });
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('re-enables button after request completes', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<DeleteFollowInlineButton followId="4" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Smazat' })).toBeEnabled();
    });
  });
});

