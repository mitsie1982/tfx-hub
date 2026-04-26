export type CustomerTabKey = 'overview' | 'professionals' | 'request';

export type CustomerRoute =
  | { key: 'overview' }
  | { key: 'professionals' }
  | { key: 'request' }
  | { key: 'professionalDetail'; professionalId: string };

export function createCustomerRootRoute(tab: CustomerTabKey): CustomerRoute {
  if (tab === 'professionals') {
    return { key: 'professionals' };
  }
  if (tab === 'request') {
    return { key: 'request' };
  }
  return { key: 'overview' };
}
