import type { UserRole } from '@/lib/authTypes';

/**
 * CENTRÁLNÍ MODUL PRO LOGIKU ROLÍ
 * Jediný zdroj pravdy pro definici rolí a jejich oprávnění
 */

export function isStaffRole(role: unknown): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function isAllowedRole(value: unknown): value is UserRole {
  return value === 'user' || value === 'admin' || value === 'superadmin';
}

/**
 * Ověří, zda má role práva superadmina
 */
export function isSuperadminRole(role: unknown): boolean {
  return role === 'superadmin';
}

