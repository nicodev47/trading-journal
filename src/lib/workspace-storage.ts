export const WORKSPACE_STORAGE_KEY_PREFIX = 'eclipse-trading-journal-data';

/**
 * These IDs and storage keys are part of the persistence contract used by
 * previous EclipseJournal versions. They must not change when the navigation
 * labels or workspace grouping changes.
 */
export const LEGACY_PRIMARY_WORKSPACES = {
  personal: {
    id: 'personal',
    displayName: 'Personale',
    storageKey: 'eclipse-trading-journal-data-personal',
    group: 'account',
    position: 0,
  },
  backtest: {
    id: 'backtest',
    displayName: 'Sessione 1',
    storageKey: 'eclipse-trading-journal-data-backtest',
    group: 'backtest',
    position: 0,
  },
} as const;

export function getWorkspaceStorageKey(workspace: string) {
  if (workspace === LEGACY_PRIMARY_WORKSPACES.personal.id) {
    return LEGACY_PRIMARY_WORKSPACES.personal.storageKey;
  }

  if (workspace === LEGACY_PRIMARY_WORKSPACES.backtest.id) {
    return LEGACY_PRIMARY_WORKSPACES.backtest.storageKey;
  }

  return `${WORKSPACE_STORAGE_KEY_PREFIX}-${workspace}`;
}

export function keepLegacyWorkspaceFirst<T extends { id: string }>(
  workspaces: T[],
  legacyWorkspaceId: string
) {
  const legacyWorkspace = workspaces.find(
    (workspace) => workspace.id === legacyWorkspaceId
  );

  if (!legacyWorkspace) return workspaces;

  return [
    legacyWorkspace,
    ...workspaces.filter((workspace) => workspace.id !== legacyWorkspaceId),
  ];
}
