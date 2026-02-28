import type { AuthUser } from '@/lib/authTypes';
import type { CmsResource, CmsAction } from '@/lib/cmsAuthz';
import { can, isStaff } from '@/lib/cmsAuthz';
import { ApiError } from '@/lib/api/errors';

// CMS Authorization Guards - Centralizované vynucení autorizačních politik
// Každý command by měl na začátku zavolat příslušný guard
// Policy definice: src/lib/cmsAuthz.ts (can function)
// Policy enforcement: tento soubor (assertCms guards)

export function assertCmsCan(actor: AuthUser, resource: CmsResource, action: CmsAction): void {
  if (!can(actor, resource, action)) {
    throw new ApiError('Zakázáno', 403);
  }
}

export function assertCmsStaff(actor: AuthUser): void {
  if (!isStaff(actor)) {
    throw new ApiError('Zakázáno', 403);
  }
}

export function assertCmsOwnerOrStaff(actor: AuthUser, ownerId: bigint): void {
  const staff = isStaff(actor);
  const isOwner = ownerId === BigInt(actor.id);

  if (!staff && !isOwner) {
    throw new ApiError('Zakázáno', 403);
  }
}

export function assertCmsRole(actor: AuthUser, requireSuperadmin: boolean): void {
  if (requireSuperadmin) {
    assertCmsCan(actor, 'users', 'update');
  } else {
    assertCmsStaff(actor);
  }
}

export function assertCmsNotStaff(actor: AuthUser): void {
  if (isStaff(actor)) {
    throw new ApiError('Zakázáno', 403);
  }
}

export function assertCmsStaffFilter(actor: AuthUser, userSearchParam: unknown): void {
  if (userSearchParam != null && !isStaff(actor)) {
    throw new ApiError('Zakázáno - filtr podle uživatele je pouze pro staff', 403);
  }
}

