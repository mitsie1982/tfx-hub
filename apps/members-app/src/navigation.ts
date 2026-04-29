export type MembersTabKey = 'association' | 'professionals';

export type MembersRoute =
  | { key: 'association' }
  | { key: 'professionals' }
  | { key: 'professionalDetail'; professionalId: string };

export function createMembersRootRoute(tab: MembersTabKey): MembersRoute {
  return { key: tab };
}
