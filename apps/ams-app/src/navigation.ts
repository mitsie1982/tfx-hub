export type AdminTabKey = 'overview' | 'contractors' | 'admins';

export type AdminRoute =
  | { key: 'overview' }
  | { key: 'contractors' }
  | { key: 'admins' }
  | { key: 'contractorDetail'; professionalId: string };

export function createAdminRootRoute(tab: AdminTabKey): AdminRoute {
  if (tab === 'contractors') {
    return { key: 'contractors' };
  }
  if (tab === 'admins') {
    return { key: 'admins' };
  }
  return { key: 'overview' };
}
