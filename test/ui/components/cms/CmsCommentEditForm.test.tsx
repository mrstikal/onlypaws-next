import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CmsCommentEditForm from '@/components/cms/CmsCommentEditForm';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

global.fetch = vi.fn();

describe('CmsCommentEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with initial body text', () => {
    render(<CmsCommentEditForm commentId="5" initialBody="Initial comment text" />);

    expect(screen.getByDisplayValue('Initial comment text')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uložit' })).toBeInTheDocument();
  });

  it('shows character count', () => {
    render(<CmsCommentEditForm commentId="5" initialBody="Test" />);

    expect(screen.getByText('4/1000')).toBeInTheDocument();
  });

  it('shows validation error when body is empty', async () => {
    render(<CmsCommentEditForm commentId="5" initialBody="Original text" />);
    const user = userEvent.setup();

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    expect(screen.getByText('Text je povinný.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits form and redirects on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    render(<CmsCommentEditForm commentId="5" initialBody="Old text" />);
    const user = userEvent.setup();

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'New comment');
    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cms/comments/5', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: 'New comment' }),
      });
      expect(mockPush).toHaveBeenCalledWith('/cms/comments/5');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('displays error message on API failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Comment not found' }),
    });

    render(<CmsCommentEditForm commentId="999" initialBody="Text" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Uložit' }));

    await waitFor(() => {
      expect(screen.getByText('Comment not found')).toBeInTheDocument();
    });
  });
});

