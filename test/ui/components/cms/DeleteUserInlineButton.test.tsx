import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteUserInlineButton from '@/components/cms/DeleteUserInlineButton';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

global.fetch = vi.fn();

describe('DeleteUserInlineButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();
  });

  it('renders delete button', () => {
    render(<DeleteUserInlineButton userId="1" />);

    expect(screen.getByRole('button', { name: 'Smazat' })).toBeInTheDocument();
  });

  it('shows confirmation dialog before delete', async () => {
    window.confirm = vi.fn(() => false);

    render(<DeleteUserInlineButton userId="1" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Opravdu smazat uživatele? (Smažou se i navázaná data podle DB relací)',
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls DELETE API and redirects on success', async () => {
    window.confirm = vi.fn(() => true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    render(<DeleteUserInlineButton userId="5" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cms/users/5', { method: 'DELETE' });
      expect(mockPush).toHaveBeenCalledWith('/cms/admin/users');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('shows alert on API failure', async () => {
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Cannot delete user' }),
    });

    render(<DeleteUserInlineButton userId="6" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Cannot delete user');
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('disables button while loading', async () => {
    window.confirm = vi.fn(() => true);
    let resolvePromise: () => void;
    const pending = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ok: true,
      json: async () => {
        await pending;
        return { ok: true };
      },
    });

    render(<DeleteUserInlineButton userId="7" />);
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Smazat' });

    const clickPromise = user.click(button);

    // Button should be disabled while loading
    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    resolvePromise!();
    await clickPromise;
  });
});

