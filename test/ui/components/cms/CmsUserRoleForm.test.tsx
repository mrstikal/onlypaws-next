import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmsUserRoleForm from '@/components/cms/CmsUserRoleForm';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

global.fetch = vi.fn();

describe('CmsUserRoleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with initial role', () => {
    render(<CmsUserRoleForm userId="1" initialRole="user" />);

    expect(screen.getByDisplayValue('user')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uložit' })).toBeInTheDocument();
  });

  it('allows changing role selection', async () => {
    render(<CmsUserRoleForm userId="1" initialRole="user" />);
    const user = userEvent.setup();

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'admin');

    expect(screen.getByDisplayValue('admin')).toBeInTheDocument();
  });

  it('submits form with selected role and redirects', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    render(<CmsUserRoleForm userId="5" initialRole="user" />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox'), 'superadmin');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cms/users/5', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'superadmin' }),
      });
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/cms/admin/users/5');
    });
  });

  it('displays error message on submit failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Permission denied' }),
    });

    render(<CmsUserRoleForm userId="6" initialRole="admin" />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox'), 'superadmin');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(screen.getByText('Permission denied')).toBeInTheDocument();
    });
  });
});

