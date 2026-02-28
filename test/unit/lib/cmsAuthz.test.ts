import { describe, expect, it } from 'vitest';
import { can, isStaff, type CmsAction, type CmsResource } from '@/lib/cmsAuthz';
import type { AuthUser } from '@/lib/authTypes';

const user: AuthUser = { id: '1', name: 'User', email: 'u@example.com', role: 'user' };
const admin: AuthUser = { id: '2', name: 'Admin', email: 'a@example.com', role: 'admin' };
const superadmin: AuthUser = { id: '3', name: 'Root', email: 'r@example.com', role: 'superadmin' };

describe('isStaff', () => {
  it('returns true for admin and superadmin', () => {
    expect(isStaff(admin)).toBe(true);
    expect(isStaff(superadmin)).toBe(true);
  });

  it('returns false for regular user', () => {
    expect(isStaff(user)).toBe(false);
  });
});

describe('can', () => {
  it('allows only superadmin for users resource list/view/update/delete', () => {
    const actions: CmsAction[] = ['list', 'view', 'update', 'delete'];
    for (const action of actions) {
      expect(can(superadmin, 'users', action)).toBe(true);
      expect(can(admin, 'users', action)).toBe(false);
      expect(can(user, 'users', action)).toBe(false);
    }
  });

  it('always denies users:create', () => {
    expect(can(superadmin, 'users', 'create')).toBe(false);
    expect(can(admin, 'users', 'create')).toBe(false);
    expect(can(user, 'users', 'create')).toBe(false);
  });

  it('allows subscription_tiers only for superadmin', () => {
    const actions: CmsAction[] = ['list', 'view', 'create', 'update', 'delete'];
    for (const action of actions) {
      expect(can(superadmin, 'subscription_tiers', action)).toBe(true);
      expect(can(admin, 'subscription_tiers', action)).toBe(false);
      expect(can(user, 'subscription_tiers', action)).toBe(false);
    }
  });

  it('likes and follows deny create/update and allow delete only for staff', () => {
    const resources: CmsResource[] = ['likes', 'follows'];
    for (const resource of resources) {
      expect(can(user, resource, 'create')).toBe(false);
      expect(can(user, resource, 'update')).toBe(false);
      expect(can(user, resource, 'delete')).toBe(false);
      expect(can(admin, resource, 'delete')).toBe(true);
      expect(can(superadmin, resource, 'delete')).toBe(true);
      expect(can(user, resource, 'list')).toBe(true);
      expect(can(user, resource, 'view')).toBe(true);
    }
  });

  it('comments deny create, and update/delete require staff', () => {
    expect(can(user, 'comments', 'create')).toBe(false);
    expect(can(user, 'comments', 'update')).toBe(false);
    expect(can(user, 'comments', 'delete')).toBe(false);
    expect(can(admin, 'comments', 'update')).toBe(true);
    expect(can(superadmin, 'comments', 'delete')).toBe(true);
    expect(can(user, 'comments', 'list')).toBe(true);
    expect(can(user, 'comments', 'view')).toBe(true);
  });

  it('pets/posts allow create for non-staff and allow update/delete for everyone', () => {
    const resources: CmsResource[] = ['pets', 'posts'];
    for (const resource of resources) {
      expect(can(user, resource, 'create')).toBe(true);
      expect(can(admin, resource, 'create')).toBe(false);
      expect(can(user, resource, 'update')).toBe(true);
      expect(can(user, resource, 'delete')).toBe(true);
      expect(can(admin, resource, 'list')).toBe(true);
      expect(can(superadmin, resource, 'view')).toBe(true);
    }
  });
});

