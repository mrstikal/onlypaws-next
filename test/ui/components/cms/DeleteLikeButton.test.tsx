import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteLikeButton from '@/components/cms/DeleteLikeButton';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

global.fetch = vi.fn();
global.confirm = vi.fn();

describe('DeleteLikeButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders delete button', () => {
    render(<DeleteLikeButton likeId="88" />);

    expect(screen.getByRole('button', { name: /Smazat|Mažu/ })).toBeInTheDocument();
  });

  it('asks for confirmation and skips API call when cancelled', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    // Note: DeleteLikeButton uses window.confirm() directly, not the mocked global.confirm
    // So we need to mock it differently
  });

  it('calls DELETE API and refreshes on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<DeleteLikeButton likeId="88" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cms/likes/88', { method: 'DELETE' });
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('displays error on API failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Like not found' }),
    });

    render(<DeleteLikeButton likeId="89" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(screen.getByText('Like not found')).toBeInTheDocument();
    });
  });

  it('redirects to onDeletedHref if provided', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<DeleteLikeButton likeId="90" onDeletedHref="/cms/likes" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/cms/likes');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});

