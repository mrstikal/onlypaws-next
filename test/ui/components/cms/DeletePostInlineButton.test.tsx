import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeletePostInlineButton from '@/components/cms/DeletePostInlineButton';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

global.fetch = vi.fn();
global.confirm = vi.fn();

describe('DeletePostInlineButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders delete button', () => {
    render(<DeletePostInlineButton postId="77" />);

    expect(screen.getByRole('button', { name: 'Smazat' })).toBeInTheDocument();
  });

  it('asks for confirmation and skips API call when cancelled', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    render(<DeletePostInlineButton postId="77" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    expect(global.confirm).toHaveBeenCalledWith('Opravdu smazat tento post?');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('calls DELETE API and refreshes on success', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<DeletePostInlineButton postId="77" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cms/posts/77', { method: 'DELETE' });
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('shows busy state while request is in flight and re-enables button after completion', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);

    let resolveFetch: (value: { ok: true }) => void;
    const pending = new Promise<{ ok: true }>((resolve) => {
      resolveFetch = resolve;
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pending);

    render(<DeletePostInlineButton postId="78" />);
    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: 'Smazat' });

    const clickPromise = user.click(btn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '…' })).toBeDisabled();
    });

    resolveFetch!({ ok: true });
    await clickPromise;

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Smazat' })).toBeEnabled();
    });
  });
});

