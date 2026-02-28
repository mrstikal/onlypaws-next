// src/lib/cmsAuthz.ts
import type { AuthUser } from '@/lib/authTypes';
import { isStaffRole, isSuperadminRole } from '@/lib/server/roles';

export type CmsRole = AuthUser['role'];
export type CmsAction = 'list' | 'view' | 'create' | 'update' | 'delete';
export type CmsResource = 'pets' | 'posts' | 'comments' | 'likes' | 'follows' | 'subscription_tiers' | 'users';

/**
 * Ověří, zda je uživatel člen staff týmu (admin nebo superadmin)
 * POZNÁMKA: Logika rolí je centralizovaná v server/roles.ts
 */
export function isStaff(user: AuthUser) {
  return isStaffRole(user.role);
}

export function can(user: AuthUser, resource: CmsResource, action: CmsAction) {
  const staff = isStaff(user);

  if (resource === 'users') {
    // Správa uživatelů: jen superadmin (self-protection řešíme ještě v API u DELETE)
    if (action === 'create') return false;
    return isSuperadminRole(user.role); // list/view/update/delete
  }

  if (resource === 'subscription_tiers') return isSuperadminRole(user.role);

  if (resource === 'likes') {
    if (action === 'create' || action === 'update') return false;
    if (action === 'delete') return staff; // user nikdy nemaže likes
    return true; // list/view
  }

  if (resource === 'follows') {
    if (action === 'create' || action === 'update') return false;
    if (action === 'delete') return staff; // v CMS maže follow jen staff
    return true;
  }

  if (resource === 'comments') {
    if (action === 'create') return false; // v CMS se komentáře netvoří
    if (action === 'update' || action === 'delete') return staff;
    return true;
  }

  if (resource === 'pets' || resource === 'posts') {
    if (action === 'create') return !staff; // staff nevytváří obsah
    if (action === 'update' || action === 'delete') return true; // record-level se dořeší ownershipem
    return true;
  }

  return false;
}