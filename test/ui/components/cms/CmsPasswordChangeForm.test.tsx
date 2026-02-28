import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmsPasswordChangeForm from '@/components/cms/CmsPasswordChangeForm';

global.fetch = vi.fn();
const mockAssign = vi.fn();

Object.defineProperty(window, 'location', {
  writable: true,
  value: { assign: mockAssign },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CmsPasswordChangeForm', () => {
  it('renders form with 3 password fields', () => {
    render(<CmsPasswordChangeForm />);
    expect(screen.getByText('Změna hesla')).toBeInTheDocument();
    expect(screen.getByLabelText(/aktuální heslo/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/nové heslo/i)).toHaveLength(2);
  });

  it('submits password change request and shows success message', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<CmsPasswordChangeForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/aktuální heslo/i), 'oldPass123');
    const [newPass, confirmPass] = screen.getAllByLabelText(/nové heslo/i);
    expect(newPass).toBeDefined();
    expect(confirmPass).toBeDefined();
    await user.type(newPass!, 'newPass456');
    await user.type(confirmPass!, 'newPass456');

    await user.click(screen.getByRole('button', { name: /změnit heslo/i }));

    await waitFor(() => {
      expect(screen.getByText(/heslo změněno/i)).toBeInTheDocument();
    });
  });

  it('displays error when server returns non-ok response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Wrong password' }),
    });

    render(<CmsPasswordChangeForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/aktuální heslo/i), 'wrong');
    const [newPass, confirmPass] = screen.getAllByLabelText(/nové heslo/i);
    expect(newPass).toBeDefined();
    expect(confirmPass).toBeDefined();
    await user.type(newPass!, 'newPass456');
    await user.type(confirmPass!, 'newPass456');

    await user.click(screen.getByRole('button', { name: /změnit heslo/i }));

    await waitFor(() => {
      expect(screen.getByText('Wrong password')).toBeInTheDocument();
    });
  });
});

