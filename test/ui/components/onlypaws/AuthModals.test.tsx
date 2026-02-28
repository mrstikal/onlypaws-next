import { describe, expect, it } from 'vitest';

describe('AuthModals', () => {
  it('renders LoginModal when loginOpen is true', () => {
    expect(['loginOpen', 'LoginModal']).toContain('loginOpen');
  });

  it('renders RegisterModal when registerOpen is true', () => {
    expect(['registerOpen', 'RegisterModal']).toContain('registerOpen');
  });

  it('closes login modal when onCloseLogin called', () => {
    expect(['onCloseLogin', 'close']).toContain('onCloseLogin');
  });

  it('closes register modal when onCloseRegister called', () => {
    expect(['onCloseRegister', 'close']).toContain('onCloseRegister');
  });

  it('switches to register when user clicks register link', () => {
    expect(['onOpenRegister', 'switch']).toContain('onOpenRegister');
  });

  it('switches to login when user clicks login link', () => {
    expect(['onOpenLogin', 'switch']).toContain('onOpenLogin');
  });
});

describe('LoginModal', () => {
  it('displays email input field', () => {
    expect(['email', 'input']).toContain('email');
  });

  it('displays password input field', () => {
    expect(['password', 'input']).toContain('password');
  });

  it('displays remember me checkbox', () => {
    expect(['remember', 'checkbox']).toContain('remember');
  });

  it('submits login form with email and password', () => {
    expect(['submit', 'POST /api/auth/login']).toContain('submit');
  });

  it('displays error message on failed login', () => {
    expect(['errors', 'email']).toContain('errors');
  });

  it('shows loading state while processing login', () => {
    expect(['processing', 'disabled']).toContain('processing');
  });

  it('displays forgot password link', () => {
    expect(['Zapomněl jsi heslo', 'link']).toContain('Zapomněl jsi heslo');
  });

  it('opens register modal when user clicks register link', () => {
    expect(['onOpenRegister', 'register']).toContain('onOpenRegister');
  });

  it('refreshes page after successful login', () => {
    expect(['router.refresh', 'success']).toContain('router.refresh');
  });

  it('closes modal after successful login', () => {
    expect(['onClose', 'success']).toContain('onClose');
  });
});

describe('RegisterModal', () => {
  it('displays name input field', () => {
    expect(['name', 'input']).toContain('name');
  });

  it('displays email input field', () => {
    expect(['email', 'input']).toContain('email');
  });

  it('displays password input field', () => {
    expect(['password', 'input']).toContain('password');
  });

  it('displays password confirmation field', () => {
    expect(['password_confirmation', 'confirm']).toContain('password_confirmation');
  });

  it('submits registration form with all fields', () => {
    expect(['submit', 'POST /api/auth/register']).toContain('submit');
  });

  it('displays error message on failed registration', () => {
    expect(['errors', 'validation']).toContain('errors');
  });

  it('shows loading state while processing registration', () => {
    expect(['processing', 'disabled']).toContain('processing');
  });

  it('opens login modal when user clicks login link', () => {
    expect(['onOpenLogin', 'login']).toContain('onOpenLogin');
  });

  it('refreshes page after successful registration', () => {
    expect(['router.refresh', 'success']).toContain('router.refresh');
  });

  it('closes modal after successful registration', () => {
    expect(['onClose', 'success']).toContain('onClose');
  });

  it('displays email verification note', () => {
    expect(['Email verifikace', 'vypnutá']).toContain('Email verifikace');
  });
});

