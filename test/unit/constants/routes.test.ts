import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/constants/routes';

describe('ROUTES', () => {
  it('contains expected static paths', () => {
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.CMS.ROOT).toBe('/cms');
    expect(ROUTES.CMS.PROFILE).toBe('/cms/profile');
    expect(ROUTES.CMS.ADMIN.USERS).toBe('/cms/admin/users');
    expect(ROUTES.CMS.ADMIN.SUBSCRIPTION_TIERS).toBe('/cms/admin/subscription-tiers');
    expect(ROUTES.API.AUTH.LOGIN).toBe('/api/auth/login');
  });

  it('builds detail routes from id and slug', () => {
    expect(ROUTES.pet('10', 'micka')).toBe('/pets/10/micka');
    expect(ROUTES.post('22', 'pekny-post')).toBe('/posts/22/pekny-post');
  });

  it('builds cms detail and admin detail routes', () => {
    expect(ROUTES.CMS.post('11')).toBe('/cms/posts/11');
    expect(ROUTES.CMS.postEdit('11')).toBe('/cms/posts/11/edit');
    expect(ROUTES.CMS.breed('5')).toBe('/cms/breeds/5');
    expect(ROUTES.CMS.ADMIN.user('8')).toBe('/cms/admin/users/8');
    expect(ROUTES.CMS.ADMIN.subscriptionTierEdit('3')).toBe('/cms/admin/subscription-tiers/3/edit');
  });
});
