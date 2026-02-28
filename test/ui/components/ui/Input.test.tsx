import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TextInput from '@/components/ui/TextInput';
import Checkbox from '@/components/ui/Checkbox';
import InputLabel from '@/components/ui/InputLabel';
import InputError from '@/components/ui/InputError';

describe('TextInput', () => {
  it('renders input with placeholder', () => {
    render(<TextInput placeholder="Enter email" />);
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('defaults to type=text', () => {
    render(<TextInput data-testid="test-input" />);
    expect(screen.getByTestId('test-input')).toHaveAttribute('type', 'text');
  });
});

describe('Checkbox', () => {
  it('renders checkbox input', () => {
    render(<Checkbox data-testid="cb" />);
    const cb = screen.getByTestId('cb');
    expect(cb).toHaveAttribute('type', 'checkbox');
  });
});

describe('InputLabel', () => {
  it('renders label with text', () => {
    render(<InputLabel htmlFor="email" value="Email Address" />);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });
});

describe('InputError', () => {
  it('renders error message when provided', () => {
    render(<InputError message="Field is required" />);
    expect(screen.getByText('Field is required')).toBeInTheDocument();
  });

  it('renders nothing when message is empty', () => {
    const { container } = render(<InputError />);
    expect(container.firstChild).toBeNull();
  });
});

