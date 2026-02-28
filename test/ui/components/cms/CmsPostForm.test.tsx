import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmsPostForm from '@/components/cms/CmsPostForm';

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

const pets = [
  { id: '1', name: 'Buddy' },
  { id: '2', name: 'Micka' },
];

const tiers = [
  { id: '1', name: 'Basic', slug: 'basic' },
  { id: '2', name: 'Premium', slug: 'premium' },
];

describe('CmsPostForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode', () => {
    render(<CmsPostForm mode="create" pets={pets} tiers={tiers} />);

    expect(screen.getByText('Vytvořit post')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uložit' })).toBeInTheDocument();
  });

  it('shows error when no pet is selected', async () => {
    render(<CmsPostForm mode="create" pets={[]} tiers={tiers} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    expect(screen.getByText('Vyberte mazlíčka.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('requires tier when premium is enabled', async () => {
    render(<CmsPostForm mode="create" pets={pets} tiers={tiers} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Premium' }), '1');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    expect(screen.getByText('Vyberte tier pro premium.')).toBeInTheDocument();
  });

  it('requires media before submit', async () => {
    render(<CmsPostForm mode="create" pets={pets} tiers={tiers} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    expect(screen.getByText('Nahrajte soubor.')).toBeInTheDocument();
  });

  it('submits create form and redirects', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '77' }),
    });

    render(
      <CmsPostForm
        mode="create"
        pets={pets}
        tiers={tiers}
        initial={{
          pet_id: '2',
          caption: 'Old caption',
          is_premium: false,
          subscription_tier_id: null,
          media_type: 'image',
          media_url: 'media77.jpg',
        }}
      />,
    );
    const user = userEvent.setup();

    await user.clear(screen.getByRole('textbox', { name: 'Caption' }));
    await user.type(screen.getByRole('textbox', { name: 'Caption' }), 'New caption');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cms/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pet_id: '2',
          caption: 'New caption',
          is_premium: false,
          subscription_tier_id: null,
          media_type: 'image',
          media_url: 'media77.jpg',
        }),
      });
      expect(mockPush).toHaveBeenCalledWith('/cms/posts/77');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('shows server error when save fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Save failed' }),
    });

    render(
      <CmsPostForm
        mode="create"
        pets={pets}
        tiers={tiers}
        initial={{
          pet_id: '1',
          caption: '',
          is_premium: false,
          subscription_tier_id: null,
          media_type: 'image',
          media_url: 'ready.jpg',
        }}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });
});

