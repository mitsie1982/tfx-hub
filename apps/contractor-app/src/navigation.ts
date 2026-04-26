export type ContractorTabKey = 'dashboard' | 'browse' | 'history';

export type ContractorRoute =
  | { key: 'dashboard' }
  | { key: 'browse' }
  | { key: 'history' }
  | { key: 'detail'; projectId: string };

export function createContractorRootRoute(tab: ContractorTabKey): ContractorRoute {
  if (tab === 'browse') {
    return { key: 'browse' };
  }
  if (tab === 'history') {
    return { key: 'history' };
  }
  return { key: 'dashboard' };
}
