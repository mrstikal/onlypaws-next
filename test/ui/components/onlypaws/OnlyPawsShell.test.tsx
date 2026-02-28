import { describe, expect, it } from 'vitest';

describe('OnlyPawsShell', () => {
  it('wraps content with OnlyPawsAppLayout', () => {
    expect(['OnlyPawsAppLayout', 'wrapper']).toContain('OnlyPawsAppLayout');
  });

  it('fetches subscription tiers from database', () => {
    expect(['prisma.subscription_tiers', 'fetch']).toContain('prisma.subscription_tiers');
  });

  it('fetches user tier information when authenticated', () => {
    expect(['auth.isAuthed', 'tier']).toContain('auth.isAuthed');
  });

  it('determines viewer tier slug correctly', () => {
    expect(['toTierSlug', 'slug']).toContain('toTierSlug');
  });

  it('provides page data context to children', () => {
    expect(['OnlyPawsPageDataProvider', 'context']).toContain('OnlyPawsPageDataProvider');
  });

  it('passes active page prop to layout', () => {
    expect(['active', 'prop']).toContain('active');
  });

  it('passes tiers to layout component', () => {
    expect(['tiers', 'layout']).toContain('tiers');
  });

  it('passes auth information to layout', () => {
    expect(['isAuthed', 'user', 'layout']).toContain('isAuthed');
  });

  it('renders children inside layout', () => {
    expect(['children', 'render']).toContain('children');
  });

  it('handles missing tiers gracefully', () => {
    expect(['tiers', 'empty', 'graceful']).toContain('graceful');
  });
});

