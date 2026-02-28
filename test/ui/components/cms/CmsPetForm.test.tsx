import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmsPetForm from '@/components/cms/CmsPetForm';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ''} style={{ width: '100%', height: 'auto' }} />
  ),
}));

global.fetch = vi.fn();

const breeds = [
  { id: '1', name: 'Labrador', species: 'dog' },
  { id: '2', name: 'Persian', species: 'cat' },
];

describe('CmsPetForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode', () => {
    render(<CmsPetForm mode="create" breeds={breeds} />);

    expect(screen.getByText('Vytvořit mazlíčka')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uložit' })).toBeInTheDocument();
  });

  it('renders edit mode with initial values', () => {
    render(
      <CmsPetForm
        mode="edit"
        petId="9"
        breeds={breeds}
        initial={{
          name: 'Buddy',
          bio: 'Friendly pet',
          age_years: 2,
          age_months: 6,
          breed_id: '2',
          profile_picture: 'buddy.jpg',
        }}
      />,
    );

    expect(screen.getByText('Upravit mazlíčka')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Buddy')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Friendly pet')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });

  it('shows validation error when name is empty', async () => {
    render(<CmsPetForm mode="create" breeds={breeds} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    expect(screen.getByText('Jméno je povinné.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits create form and redirects to created pet detail', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '42' }),
    });

    render(<CmsPetForm mode="create" breeds={breeds} />);
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox', { name: 'Jméno' }), '  Rex  ');
    await user.type(screen.getByRole('textbox', { name: 'Bio' }), '  Good boy  ');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cms/pets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Rex',
          bio: 'Good boy',
          age_years: null,
          age_months: null,
          breed_id: null,
          profile_picture: null,
        }),
      });
      expect(mockPush).toHaveBeenCalledWith('/cms/pets/42');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('shows server error when submit fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    render(<CmsPetForm mode="create" breeds={breeds} />);
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox', { name: 'Jméno' }), 'Rex');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});

