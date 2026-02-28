import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmsSubscriptionTierForm from '@/components/cms/CmsSubscriptionTierForm';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('@/components/cms/DeleteSubscriptionTierInlineButton', () => ({
  default: ({ tierId }: { tierId: string }) => <div data-testid={`delete-tier-${tierId}`}>Delete Button</div>,
}));

global.fetch = vi.fn();

describe('CmsSubscriptionTierForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode', () => {
    render(<CmsSubscriptionTierForm mode="create" />);

    expect(screen.getByText('Vytvořit předplatné')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uložit' })).toBeInTheDocument();
  });

  it('renders edit mode with initial values', () => {
    render(
      <CmsSubscriptionTierForm
        mode="edit"
        tierId="5"
        initial={{
          name: 'Premium',
          slug: 'premium',
          price_monthly: 99,
          description: 'Premium tier',
        }}
      />,
    );

    expect(screen.getByText('Upravit předplatné')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Premium')).toBeInTheDocument();
    expect(screen.getByDisplayValue('premium')).toBeInTheDocument();
    expect(screen.getByDisplayValue('99')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Premium tier')).toBeInTheDocument();
  });

  it('shows validation error when name is missing', async () => {
    render(<CmsSubscriptionTierForm mode="create" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    expect(screen.getByText('Název je povinný.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid slug', async () => {
    render(<CmsSubscriptionTierForm mode="create" />);
    const user = userEvent.setup();

    const nameInput = screen.getByRole('textbox', { name: 'Název' });
    const slugInput = screen.getByRole('textbox', { name: 'Slug' });

    await user.type(nameInput, 'Test Tier');
    await user.type(slugInput, 'Invalid Slug!');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    expect(screen.getByText('Slug může obsahovat jen a-z, 0-9 a pomlčky.')).toBeInTheDocument();
  });

  it('shows validation error for invalid price', async () => {
    render(<CmsSubscriptionTierForm mode="create" />);
    const user = userEvent.setup();

    const nameInput = screen.getByRole('textbox', { name: 'Název' });
    const slugInput = screen.getByRole('textbox', { name: 'Slug' });
    const priceInput = screen.getByRole('textbox', { name: 'Cena / měs.' });

    await user.type(nameInput, 'Test');
    await user.type(slugInput, 'test-tier');
    await user.clear(priceInput);
    await user.type(priceInput, 'not-a-number');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    expect(screen.getByText('Cena musí být číslo >= 0.')).toBeInTheDocument();
  });

  it('submits form in create mode and redirects', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123' }),
    });

    render(<CmsSubscriptionTierForm mode="create" />);
    const user = userEvent.setup();

    const nameInput = screen.getByRole('textbox', { name: 'Název' });
    const slugInput = screen.getByRole('textbox', { name: 'Slug' });
    const priceInput = screen.getByRole('textbox', { name: 'Cena / měs.' });

    await user.type(nameInput, 'Pro Tier');
    await user.type(slugInput, 'pro-tier');
    await user.clear(priceInput);
    await user.type(priceInput, '299');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cms/subscription-tiers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Pro Tier',
          slug: 'pro-tier',
          price_monthly: 299,
          description: null,
        }),
      });
      expect(mockPush).toHaveBeenCalledWith('/cms/admin/subscription-tiers/123');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});

