import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthModalProvider, useAuthModals } from '@/components/onlypaws/AuthModalContext';

describe('AuthModalContext', () => {
  it('provides openLogin and openRegister functions to children', () => {
    const openLoginMock = vi.fn();
    const openRegisterMock = vi.fn();

    function TestComponent() {
      const modals = useAuthModals();
      return (
        <div>
          <button onClick={() => modals?.openLogin()}>Login</button>
          <button onClick={() => modals?.openRegister()}>Register</button>
        </div>
      );
    }

    render(
      <AuthModalProvider openLogin={openLoginMock} openRegister={openRegisterMock}>
        <TestComponent />
      </AuthModalProvider>,
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it('calls openLogin when button is clicked', () => {
    const openLoginMock = vi.fn();
    const openRegisterMock = vi.fn();

    function TestComponent() {
      const modals = useAuthModals();
      return <button onClick={() => modals?.openLogin()}>Login</button>;
    }

    const { getByText } = render(
      <AuthModalProvider openLogin={openLoginMock} openRegister={openRegisterMock}>
        <TestComponent />
      </AuthModalProvider>,
    );

    const loginButton = getByText('Login');
    loginButton.click();

    expect(openLoginMock).toHaveBeenCalled();
  });

  it('calls openRegister when button is clicked', () => {
    const openLoginMock = vi.fn();
    const openRegisterMock = vi.fn();

    function TestComponent() {
      const modals = useAuthModals();
      return <button onClick={() => modals?.openRegister()}>Register</button>;
    }

    const { getByText } = render(
      <AuthModalProvider openLogin={openLoginMock} openRegister={openRegisterMock}>
        <TestComponent />
      </AuthModalProvider>,
    );

    const registerButton = getByText('Register');
    registerButton.click();

    expect(openRegisterMock).toHaveBeenCalled();
  });

  it('returns null when useAuthModals is used outside provider', () => {
    function TestComponent() {
      const modals = useAuthModals();
      return <div>{modals === null ? 'No context' : 'Has context'}</div>;
    }

    render(<TestComponent />);

    expect(screen.getByText('No context')).toBeInTheDocument();
  });
});

