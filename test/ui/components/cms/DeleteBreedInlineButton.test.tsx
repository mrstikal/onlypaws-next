import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteBreedInlineButton from '@/components/cms/DeleteBreedInlineButton';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

global.fetch = vi.fn();
global.confirm = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DeleteBreedInlineButton', () => {
  it('renders delete button', () => {
    render(<DeleteBreedInlineButton breedId="10" />);
    expect(screen.getByRole('button', { name: 'Smazat' })).toBeInTheDocument();
  });

  it('asks for confirmation before delete', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    render(<DeleteBreedInlineButton breedId="10" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));
    expect(global.confirm).toHaveBeenCalledWith('Opravdu smazat toto plemeno?');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls DELETE API and refreshes on success', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<DeleteBreedInlineButton breedId="10" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cms/breeds/10', { method: 'DELETE' });
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('displays error message on delete failure', async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Cannot delete' }),
    });

    render(<DeleteBreedInlineButton breedId="10" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Smazat' }));

    await waitFor(() => {
      expect(screen.getByText('Cannot delete')).toBeInTheDocument();
    });
  });
});

