import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmsBreedForm from '@/components/cms/CmsBreedForm';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CmsBreedForm', () => {
  it('renders create mode with empty fields', () => {
    render(<CmsBreedForm mode="create" />);
    expect(screen.getByText('Vytvořit plemeno')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uložit' })).toBeInTheDocument();
  });

  it('renders edit mode with initial values', () => {
    render(
      <CmsBreedForm
        mode="edit"
        breedId="10"
        initial={{ name: 'Labrador', species: 'dog', api_id: 'lab', description: 'Friendly dog' }}
      />
    );
    expect(screen.getByText('Upravit plemeno')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Labrador')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Friendly dog')).toBeInTheDocument();
  });

  it('displays error when name is empty on submit', async () => {
    render(<CmsBreedForm mode="create" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Uložit' }));
    expect(screen.getByText('Název je povinný.')).toBeInTheDocument();
  });

  it('submits form in create mode and redirects', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '42' }),
    });

    render(<CmsBreedForm mode="create" />);
    const user = userEvent.setup();

    const nameInput = screen.getByLabelText(/název/i);
    await user.type(nameInput, 'Golden Retriever');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/cms/breeds/42');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('displays server error on failed submit', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    render(<CmsBreedForm mode="create" />);
    const user = userEvent.setup();

    const nameInput = screen.getByLabelText(/název/i);
    await user.type(nameInput, 'TestBreed');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});

