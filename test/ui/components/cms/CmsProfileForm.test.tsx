import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmsProfileForm from '@/components/cms/CmsProfileForm';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

global.fetch = vi.fn();

describe('CmsProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with initial name value', () => {
    render(<CmsProfileForm initialName="John Doe" />);

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uložit' })).toBeInTheDocument();
  });

  it('allows changing the name input', async () => {
    render(<CmsProfileForm initialName="Jane Doe" />);
    const user = userEvent.setup();

    const input = screen.getByDisplayValue('Jane Doe');
    await user.clear(input);
    await user.type(input, 'Jane Smith');

    expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument();
  });

  it('submits form and shows success message', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    render(<CmsProfileForm initialName="Test User" />);
    const user = userEvent.setup();

    const input = screen.getByDisplayValue('Test User');
    await user.clear(input);
    await user.type(input, 'Updated User');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cms/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Updated User' }),
      });
      expect(screen.getByText('Profil aktualizován.')).toBeInTheDocument();
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('displays error message on submit failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Name is invalid' }),
    });

    render(<CmsProfileForm initialName="Test" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(screen.getByText('Name is invalid')).toBeInTheDocument();
    });
  });
});

