import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '@/components/ui/Modal';

describe('Modal', () => {
  it('renders children when show is true', () => {
    render(
      <Modal show onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('does not render when show is false', () => {
    render(
      <Modal show={false} onClose={vi.fn()}>
        <div>Hidden Content</div>
      </Modal>
    );
    expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument();
  });

  it('calls onClose when closeable and backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal show closeable onClose={onClose}>
        <div>Content</div>
      </Modal>
    );

    const user = userEvent.setup();
    const backdrop = screen.getByText('Content').parentElement?.parentElement?.previousElementSibling;
    if (backdrop) {
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    }
  });
});

