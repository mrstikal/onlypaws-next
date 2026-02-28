import { describe, expect, it } from 'vitest';

describe('TopNav', () => {
  it('renders logo with link to home', () => {
    expect(['logo', 'href', '/']).toContain('logo');
  });

  it('displays nav links for authenticated users', () => {
    expect(['Příspěvky', 'Mazlíčci', 'Plemena']).toContain('Příspěvky');
  });

  it('shows pricing link on landing variant', () => {
    expect(['variant', 'landing', 'pricing']).toContain('variant');
  });

  it('highlights active nav section', () => {
    expect(['active', 'linkClass']).toContain('active');
  });

  it('displays user menu when authenticated', () => {
    expect(['isAuthed', 'user', 'menu']).toContain('isAuthed');
  });

  it('shows user name and email in menu', () => {
    expect(['user.name', 'user.email']).toContain('user.name');
  });

  it('handles logout click', () => {
    expect(['onLogoutClick', 'logout']).toContain('onLogoutClick');
  });

  it('shows upgrade button for unauthenticated users', () => {
    expect(['!isAuthed', 'upgrade']).toContain('!isAuthed');
  });

  it('handles upgrade click', () => {
    expect(['onUpgradeClick', 'upgrade']).toContain('onUpgradeClick');
  });

  it('displays mobile nav toggle button', () => {
    expect(['isMobileNavOpen', 'hamburger']).toContain('isMobileNavOpen');
  });

  it('expands mobile nav on small screens', () => {
    expect(['mobile', 'hidden', 'xl:flex']).toContain('mobile');
  });

  it('closes mobile nav on link click', () => {
    expect(['closeMobileNav', 'href']).toContain('closeMobileNav');
  });

  it('displays tier information for subscribed users', () => {
    expect(['viewerTierSlug', 'tier']).toContain('viewerTierSlug');
  });

  it('shows upgrade button when current tier is free', () => {
    expect(['viewerTierSlug', 'free', 'upgrade']).toContain('free');
  });

  it('prevents user menu from escaping viewport', () => {
    expect(['z-30', 'overflow', 'shadow']).toContain('z-30');
  });

  it('handles click outside to close menus', () => {
    expect(['handlePointerDown', 'click outside']).toContain('handlePointerDown');
  });
});

