'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CUSTOM_TAG_PREFIX,
  TRADE_TAGS,
  type MissedTrade,
  type Trade,
  type JournalState,
  type WeeklyPlan,
} from '@/lib/types/trade';
import { hasWorkspaceContent } from '@/lib/workspace-content';
import {
  getWorkspaceStorageKey,
  LEGACY_PRIMARY_WORKSPACES,
} from '@/lib/workspace-storage';

const WORKSPACES_STORAGE_KEY = 'eclipse-trading-journal-workspaces';
const DELETED_SYSTEM_WORKSPACES_STORAGE_KEY =
  'eclipse-trading-journal-deleted-system-workspaces';
const PERSONAL_WORKSPACE_STORAGE_KEY = 'eclipse-trading-journal-personal-account';
const SECONDARY_WORKSPACE_STORAGE_KEY = 'eclipse-trading-journal-secondary-account';
const BACKTEST_WORKSPACE_STORAGE_KEY = 'eclipse-trading-journal-backtest-account';
const BACKTEST_SECOND_WORKSPACE_STORAGE_KEY = 'eclipse-trading-journal-backtest-account-2';
const PREVIEW_WORKSPACE_STORAGE_KEY = 'eclipse-trading-journal-preview-account';
const PREVIEW_SECOND_WORKSPACE_STORAGE_KEY = 'eclipse-trading-journal-preview-account-2';
const MAX_CUSTOM_WORKSPACES = 5;

export type SystemJournalWorkspace =
  | 'personal'
  | 'secondary'
  | 'student'
  | 'preview-2'
  | 'backtest'
  | 'backtest-2';
export type CustomJournalWorkspace = `custom-${string}`;
export type BacktestJournalWorkspace = `backtest-${string}`;
export type PreviewJournalWorkspace = `preview-${string}`;
export type JournalWorkspace =
  | SystemJournalWorkspace
  | CustomJournalWorkspace
  | BacktestJournalWorkspace
  | PreviewJournalWorkspace;
export type JournalWorkspaceType = 'system' | 'custom';
export type JournalWorkspaceGroup = 'account' | 'backtest' | 'preview';

export interface JournalWorkspaceMeta {
  id: JournalWorkspace;
  name: string;
  type: JournalWorkspaceType;
  initialBalance?: number;
  notes?: string;
  group?: JournalWorkspaceGroup;
}

type LegacyTrade = Partial<Trade> & { mistakes?: string[] };
type LegacyJournalState = Partial<JournalState> & {
  customMistakes?: string[];
  exportMetadata?: unknown;
};

export const SYSTEM_WORKSPACES: JournalWorkspaceMeta[] = [
  // Keep the legacy IDs: their existing data remains in the original storage keys.
  { id: LEGACY_PRIMARY_WORKSPACES.personal.id, name: LEGACY_PRIMARY_WORKSPACES.personal.displayName, type: 'system', initialBalance: 0, notes: '', group: LEGACY_PRIMARY_WORKSPACES.personal.group },
  { id: LEGACY_PRIMARY_WORKSPACES.backtest.id, name: LEGACY_PRIMARY_WORKSPACES.backtest.displayName, type: 'system', initialBalance: 0, notes: '', group: LEGACY_PRIMARY_WORKSPACES.backtest.group },
  { id: 'student', name: 'Account 1', type: 'system', initialBalance: 0, notes: '', group: 'preview' },
  { id: 'secondary', name: 'Secondario', type: 'system', initialBalance: 0, notes: 'Conto secondario', group: 'account' },
  { id: 'backtest-2', name: 'Sessione 2', type: 'system', initialBalance: 0, notes: '', group: 'backtest' },
  { id: 'preview-2', name: 'Account 2', type: 'system', initialBalance: 0, notes: '', group: 'preview' },
];

const SYSTEM_WORKSPACE_IDS = new Set(
  SYSTEM_WORKSPACES.map((workspace) => workspace.id)
);

const parseDeletedSystemWorkspaceIds = (raw: string | null) => {
  if (!raw) return [] as JournalWorkspace[];

  try {
    const ids = JSON.parse(raw) as unknown;

    return Array.isArray(ids)
      ? ids.filter(
          (id): id is JournalWorkspace =>
            typeof id === 'string' && SYSTEM_WORKSPACE_IDS.has(id as JournalWorkspace)
        )
      : [];
  } catch {
    return [];
  }
};

const DEFAULT_AVAILABLE_TAGS = TRADE_TAGS.map((tag) => tag.value);

const initialState: JournalState = {
  trades: [],
  missedTrades: [],
  tags: DEFAULT_AVAILABLE_TAGS,
  tagsInitialized: true,
  strategies: [],
  customTags: [],
  tagColors: {},
  weeklyPlans: [],
  settings: {
    currency: 'USD',
    defaultLotSize: 0.01,
  },
};

const parseImportedJournal = (jsonString: string): JournalState | null => {
  try {
    const data = JSON.parse(jsonString) as LegacyJournalState;

    if (!Array.isArray(data.trades)) {
      return null;
    }

    const trades = (data.trades as LegacyTrade[]).map(trade => ({
      ...trade,
      tags: trade.tags?.length ? trade.tags : trade.mistakes ?? [],
      isFavorite: trade.isFavorite ?? false,
    })) as Trade[];
    const customTags = Array.from(
      new Set([
        ...(data.customTags || []),
        ...(data.customMistakes || []),
        ...trades.flatMap(trade =>
          (trade.tags || []).filter(tag =>
            tag.startsWith(CUSTOM_TAG_PREFIX)
          )
        ),
      ])
    );

    const tags = data.tagsInitialized
      ? data.tags || []
      : Array.isArray(data.tags) && data.tags.length > 0
        ? data.tags
        : DEFAULT_AVAILABLE_TAGS;
    const journalData = { ...data };

    delete journalData.exportMetadata;

    return {
      ...initialState,
      ...journalData,
      trades,
      missedTrades: Array.isArray(data.missedTrades)
        ? (data.missedTrades as MissedTrade[])
        : [],
      tags,
      tagsInitialized: true,
      strategies: data.strategies || [],
      customTags,
      tagColors:
        data.tagColors && typeof data.tagColors === 'object'
          ? data.tagColors
          : {},
      weeklyPlans: data.weeklyPlans || [],
      settings: {
        ...initialState.settings,
        ...(data.settings || {}),
      },
    };
  } catch {
    return null;
  }
};

export const hasStoredWorkspaceContent = (
  workspace: JournalWorkspace
): boolean => {
  try {
    const stored = localStorage.getItem(getWorkspaceStorageKey(workspace));
    if (!stored) return false;

    return hasWorkspaceContent(parseImportedJournal(stored));
  } catch {
    return false;
  }
};

const normalizeWorkspaceName = (name: string) => name.trim().replace(/\s+/g, ' ');

const parseCustomWorkspaces = (raw: string | null): JournalWorkspaceMeta[] => {
  if (!raw) return [];

  try {
    const data = JSON.parse(raw) as unknown;

    if (!Array.isArray(data)) return [];

    return data
      .filter((item): item is Partial<JournalWorkspaceMeta> => {
        return Boolean(item) && typeof item === 'object';
      })
      .map((item) => ({
        id: String(item.id || '') as JournalWorkspace,
        name: normalizeWorkspaceName(String(item.name || '')),
        type: item.type === 'custom' ? 'custom' : 'system',
        initialBalance: 0,
        notes: typeof item.notes === 'string' ? item.notes : '',
        group:
          item.group === 'preview' || String(item.id || '').startsWith('preview-')
            ? 'preview'
            : item.group === 'backtest' || String(item.id || '').startsWith('backtest-')
              ? 'backtest'
              : 'account',
      }))
      .filter(
        (workspace): workspace is JournalWorkspaceMeta =>
          workspace.type === 'custom' &&
          (workspace.id.startsWith('custom-') ||
            workspace.id.startsWith('backtest-') ||
            workspace.id.startsWith('preview-')) &&
          workspace.name.length > 0
      )
      .slice(0, MAX_CUSTOM_WORKSPACES * 3);
  } catch {
    return [];
  }
};

const persistCustomWorkspaces = (workspaces: JournalWorkspaceMeta[]) => {
  localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces));
};

const parsePersonalWorkspace = (raw: string | null): JournalWorkspaceMeta => {
  if (!raw) return SYSTEM_WORKSPACES[0];

  try {
    const workspace = JSON.parse(raw) as Partial<JournalWorkspaceMeta>;
    const name = normalizeWorkspaceName(String(workspace.name || ''));
    return {
      ...SYSTEM_WORKSPACES[0],
      name: name || SYSTEM_WORKSPACES[0].name,
      initialBalance: 0,
      notes: typeof workspace.notes === 'string' ? workspace.notes : '',
    };
  } catch {
    return SYSTEM_WORKSPACES[0];
  }
};

const parseSecondaryWorkspace = (raw: string | null): JournalWorkspaceMeta => {
  if (!raw) return SYSTEM_WORKSPACES[3];

  try {
    const workspace = JSON.parse(raw) as Partial<JournalWorkspaceMeta>;
    const name = normalizeWorkspaceName(String(workspace.name || ''));

    return {
      ...SYSTEM_WORKSPACES[3],
      name: name || SYSTEM_WORKSPACES[3].name,
      initialBalance: 0,
      notes:
        typeof workspace.notes === 'string' && workspace.notes.trim()
          ? workspace.notes
          : SYSTEM_WORKSPACES[3].notes,
    };
  } catch {
    return SYSTEM_WORKSPACES[3];
  }
};

const parseBacktestWorkspace = (raw: string | null): JournalWorkspaceMeta => {
  if (!raw) return SYSTEM_WORKSPACES[1];

  try {
    const workspace = JSON.parse(raw) as Partial<JournalWorkspaceMeta>;
    const name = normalizeWorkspaceName(String(workspace.name || ''));
    const normalizedName =
      name === 'Backtest' || name === 'Backtest principale'
        ? SYSTEM_WORKSPACES[1].name
        : name;

    return {
      ...SYSTEM_WORKSPACES[1],
      name: normalizedName || SYSTEM_WORKSPACES[1].name,
      initialBalance: 0,
      notes: typeof workspace.notes === 'string' ? workspace.notes : '',
    };
  } catch {
    return SYSTEM_WORKSPACES[1];
  }
};

const parsePreviewWorkspace = (raw: string | null): JournalWorkspaceMeta => {
  if (!raw) return SYSTEM_WORKSPACES[2];

  try {
    const workspace = JSON.parse(raw) as Partial<JournalWorkspaceMeta>;
    const name = normalizeWorkspaceName(String(workspace.name || ''));
    const normalizedName = name === 'Preview' ? SYSTEM_WORKSPACES[2].name : name;

    return {
      ...SYSTEM_WORKSPACES[2],
      name: normalizedName || SYSTEM_WORKSPACES[2].name,
      initialBalance: 0,
      notes: typeof workspace.notes === 'string' ? workspace.notes : '',
    };
  } catch {
    return SYSTEM_WORKSPACES[2];
  }
};

const parseBacktestSecondWorkspace = (raw: string | null): JournalWorkspaceMeta => {
  if (!raw) return SYSTEM_WORKSPACES[4];

  try {
    const workspace = JSON.parse(raw) as Partial<JournalWorkspaceMeta>;
    const name = normalizeWorkspaceName(String(workspace.name || ''));
    return {
      ...SYSTEM_WORKSPACES[4],
      name: name || SYSTEM_WORKSPACES[4].name,
      notes: typeof workspace.notes === 'string' ? workspace.notes : '',
    };
  } catch {
    return SYSTEM_WORKSPACES[4];
  }
};

const parsePreviewSecondWorkspace = (raw: string | null): JournalWorkspaceMeta => {
  if (!raw) return SYSTEM_WORKSPACES[5];

  try {
    const workspace = JSON.parse(raw) as Partial<JournalWorkspaceMeta>;
    const name = normalizeWorkspaceName(String(workspace.name || ''));
    return {
      ...SYSTEM_WORKSPACES[5],
      name: name || SYSTEM_WORKSPACES[5].name,
      notes: typeof workspace.notes === 'string' ? workspace.notes : '',
    };
  } catch {
    return SYSTEM_WORKSPACES[5];
  }
};

export function useJournalWorkspaces() {
  const [customWorkspaces, setCustomWorkspaces] = useState<JournalWorkspaceMeta[]>([]);
  const [personalWorkspace, setPersonalWorkspace] = useState<JournalWorkspaceMeta>(
    SYSTEM_WORKSPACES[0]
  );
  const [secondaryWorkspace, setSecondaryWorkspace] = useState<JournalWorkspaceMeta>(
    SYSTEM_WORKSPACES[3]
  );
  const [backtestWorkspace, setBacktestWorkspace] = useState<JournalWorkspaceMeta>(
    SYSTEM_WORKSPACES[1]
  );
  const [previewWorkspace, setPreviewWorkspace] = useState<JournalWorkspaceMeta>(
    SYSTEM_WORKSPACES[2]
  );
  const [backtestSecondWorkspace, setBacktestSecondWorkspace] = useState<JournalWorkspaceMeta>(
    SYSTEM_WORKSPACES[4]
  );
  const [previewSecondWorkspace, setPreviewSecondWorkspace] = useState<JournalWorkspaceMeta>(
    SYSTEM_WORKSPACES[5]
  );

  useEffect(() => {
    setCustomWorkspaces(parseCustomWorkspaces(localStorage.getItem(WORKSPACES_STORAGE_KEY)));
    setPersonalWorkspace(
      parsePersonalWorkspace(localStorage.getItem(PERSONAL_WORKSPACE_STORAGE_KEY))
    );
    setSecondaryWorkspace(
      parseSecondaryWorkspace(localStorage.getItem(SECONDARY_WORKSPACE_STORAGE_KEY))
    );
    setBacktestWorkspace(
      parseBacktestWorkspace(localStorage.getItem(BACKTEST_WORKSPACE_STORAGE_KEY))
    );
    setPreviewWorkspace(
      parsePreviewWorkspace(localStorage.getItem(PREVIEW_WORKSPACE_STORAGE_KEY))
    );
    setBacktestSecondWorkspace(
      parseBacktestSecondWorkspace(
        localStorage.getItem(BACKTEST_SECOND_WORKSPACE_STORAGE_KEY)
      )
    );
    setPreviewSecondWorkspace(
      parsePreviewSecondWorkspace(
        localStorage.getItem(PREVIEW_SECOND_WORKSPACE_STORAGE_KEY)
      )
    );
  }, []);

  const createWorkspace = useCallback((
    name: string,
    group: JournalWorkspaceGroup = 'account',
    notes = ''
  ) => {
    const normalizedName = normalizeWorkspaceName(name);

    if (!normalizedName || normalizedName.length > 20) {
      return { success: false, error: 'Inserisci un nome valido, massimo 20 caratteri.' };
    }

    const allNames = [personalWorkspace, secondaryWorkspace, backtestWorkspace, backtestSecondWorkspace, previewWorkspace, previewSecondWorkspace, ...customWorkspaces].map((workspace) =>
      workspace.name.toLowerCase()
    );

    if (allNames.includes(normalizedName.toLowerCase())) {
      return { success: false, error: 'Esiste già uno spazio di lavoro con questo nome.' };
    }

    const groupWorkspaceCount = customWorkspaces.filter(
      (workspace) => (workspace.group ?? 'account') === group
    ).length;

    if (groupWorkspaceCount >= MAX_CUSTOM_WORKSPACES) {
      return {
        success: false,
        error: `Hai raggiunto il limite massimo di 5 conti ${group === 'backtest' ? 'Backtest' : group === 'preview' ? 'Preview' : 'personalizzati'}.`,
      };
    }

    const workspaceId = group === 'backtest'
      ? `backtest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` as BacktestJournalWorkspace
      : group === 'preview'
        ? `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` as PreviewJournalWorkspace
        : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` as CustomJournalWorkspace;
    const workspace: JournalWorkspaceMeta = {
      id: workspaceId,
      name: normalizedName,
      type: 'custom',
      initialBalance: 0,
      notes: notes.trim(),
      group,
    };
    const nextWorkspaces = [...customWorkspaces, workspace];

    persistCustomWorkspaces(nextWorkspaces);
    setCustomWorkspaces(nextWorkspaces);

    return { success: true, workspace };
  }, [backtestSecondWorkspace, backtestWorkspace, customWorkspaces, personalWorkspace, previewSecondWorkspace, previewWorkspace, secondaryWorkspace]);

  const updateWorkspace = useCallback((
    workspaceId: JournalWorkspace,
    name: string,
    notes: string
  ) => {
    if (
      workspaceId !== 'personal' &&
      workspaceId !== 'secondary' &&
      workspaceId !== 'backtest' &&
      workspaceId !== 'student' &&
      !workspaceId.startsWith('custom-') &&
      !workspaceId.startsWith('backtest-') &&
      !workspaceId.startsWith('preview-')
    ) {
      return { success: false, error: 'Questo spazio non può essere modificato.' };
    }

    const normalizedName = normalizeWorkspaceName(name);

    if (!normalizedName || normalizedName.length > 20) {
      return { success: false, error: 'Inserisci un nome valido, massimo 20 caratteri.' };
    }

    const duplicateName = [
      personalWorkspace,
      secondaryWorkspace,
      backtestWorkspace,
      backtestSecondWorkspace,
      previewWorkspace,
      previewSecondWorkspace,
      ...customWorkspaces,
    ].some(
      (workspace) =>
        workspace.id !== workspaceId &&
        workspace.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (duplicateName) {
      return { success: false, error: 'Esiste già un conto con questo nome.' };
    }

    if (workspaceId === 'personal') {
      const updatedWorkspace = {
        ...personalWorkspace,
        name: normalizedName,
        initialBalance: 0,
        notes: notes.trim(),
      };

      localStorage.setItem(
        PERSONAL_WORKSPACE_STORAGE_KEY,
        JSON.stringify(updatedWorkspace)
      );
      setPersonalWorkspace(updatedWorkspace);
      return { success: true, workspace: updatedWorkspace };
    }

    if (workspaceId === 'secondary') {
      const updatedWorkspace = {
        ...secondaryWorkspace,
        name: normalizedName,
        initialBalance: 0,
        notes: notes.trim(),
      };

      localStorage.setItem(
        SECONDARY_WORKSPACE_STORAGE_KEY,
        JSON.stringify(updatedWorkspace)
      );
      setSecondaryWorkspace(updatedWorkspace);
      return { success: true, workspace: updatedWorkspace };
    }

    if (workspaceId === 'backtest') {
      const updatedWorkspace = {
        ...backtestWorkspace,
        name: normalizedName,
        initialBalance: 0,
        notes: notes.trim(),
      };

      localStorage.setItem(
        BACKTEST_WORKSPACE_STORAGE_KEY,
        JSON.stringify(updatedWorkspace)
      );
      setBacktestWorkspace(updatedWorkspace);
      return { success: true, workspace: updatedWorkspace };
    }

    if (workspaceId === 'student') {
      const updatedWorkspace = {
        ...previewWorkspace,
        name: normalizedName,
        initialBalance: 0,
        notes: notes.trim(),
      };

      localStorage.setItem(
        PREVIEW_WORKSPACE_STORAGE_KEY,
        JSON.stringify(updatedWorkspace)
      );
      setPreviewWorkspace(updatedWorkspace);
      return { success: true, workspace: updatedWorkspace };
    }

    if (workspaceId === 'backtest-2') {
      const updatedWorkspace = {
        ...backtestSecondWorkspace,
        name: normalizedName,
        notes: notes.trim(),
      };
      localStorage.setItem(
        BACKTEST_SECOND_WORKSPACE_STORAGE_KEY,
        JSON.stringify(updatedWorkspace)
      );
      setBacktestSecondWorkspace(updatedWorkspace);
      return { success: true, workspace: updatedWorkspace };
    }

    if (workspaceId === 'preview-2') {
      const updatedWorkspace = {
        ...previewSecondWorkspace,
        name: normalizedName,
        notes: notes.trim(),
      };
      localStorage.setItem(
        PREVIEW_SECOND_WORKSPACE_STORAGE_KEY,
        JSON.stringify(updatedWorkspace)
      );
      setPreviewSecondWorkspace(updatedWorkspace);
      return { success: true, workspace: updatedWorkspace };
    }

    const workspace = customWorkspaces.find((item) => item.id === workspaceId);

    if (!workspace) return { success: false, error: 'Conto non trovato.' };

    const updatedWorkspace = {
      ...workspace,
      name: normalizedName,
      initialBalance: 0,
      notes: notes.trim(),
    };
    const nextWorkspaces = customWorkspaces.map((item) =>
      item.id === workspaceId ? updatedWorkspace : item
    );

    persistCustomWorkspaces(nextWorkspaces);
    setCustomWorkspaces(nextWorkspaces);
    return { success: true, workspace: updatedWorkspace };
  }, [backtestSecondWorkspace, backtestWorkspace, customWorkspaces, personalWorkspace, previewSecondWorkspace, previewWorkspace, secondaryWorkspace]);

  const deleteWorkspace = useCallback((workspaceId: JournalWorkspace) => {
    if (workspaceId === 'personal') {
      localStorage.removeItem(PERSONAL_WORKSPACE_STORAGE_KEY);
      setPersonalWorkspace(SYSTEM_WORKSPACES[0]);
      return true;
    }

    if (workspaceId === 'backtest-2') {
      localStorage.removeItem(BACKTEST_SECOND_WORKSPACE_STORAGE_KEY);
      setBacktestSecondWorkspace(SYSTEM_WORKSPACES[4]);
      return true;
    }

    if (workspaceId === 'preview-2') {
      localStorage.removeItem(PREVIEW_SECOND_WORKSPACE_STORAGE_KEY);
      setPreviewSecondWorkspace(SYSTEM_WORKSPACES[5]);
      return true;
    }

    if (workspaceId === 'secondary') {
      localStorage.removeItem(SECONDARY_WORKSPACE_STORAGE_KEY);
      setSecondaryWorkspace(SYSTEM_WORKSPACES[3]);
      return true;
    }

    if (workspaceId === 'backtest') {
      localStorage.removeItem(BACKTEST_WORKSPACE_STORAGE_KEY);
      setBacktestWorkspace(SYSTEM_WORKSPACES[1]);
      return true;
    }

    if (workspaceId === 'student') {
      localStorage.removeItem(PREVIEW_WORKSPACE_STORAGE_KEY);
      setPreviewWorkspace(SYSTEM_WORKSPACES[2]);
      return true;
    }

    const workspace = customWorkspaces.find((item) => item.id === workspaceId);

    if (!workspace) return false;

    const nextWorkspaces = customWorkspaces.filter((item) => item.id !== workspaceId);

    persistCustomWorkspaces(nextWorkspaces);
    localStorage.removeItem(getWorkspaceStorageKey(workspaceId));
    setCustomWorkspaces(nextWorkspaces);

    return true;
  }, [customWorkspaces]);

  const reorderCustomWorkspaces = useCallback((
    sourceId: JournalWorkspace,
    targetId: JournalWorkspace
  ) => {
    if (sourceId === targetId) return;

    const sourceIndex = customWorkspaces.findIndex((item) => item.id === sourceId);
    const targetIndex = customWorkspaces.findIndex((item) => item.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextWorkspaces = [...customWorkspaces];
    const [movedWorkspace] = nextWorkspaces.splice(sourceIndex, 1);

    nextWorkspaces.splice(targetIndex, 0, movedWorkspace);
    persistCustomWorkspaces(nextWorkspaces);
    setCustomWorkspaces(nextWorkspaces);
  }, [customWorkspaces]);

  const restoreCustomWorkspaces = useCallback((workspaces: JournalWorkspaceMeta[]) => {
    const restoredPersonal = workspaces.find((workspace) => workspace.id === 'personal');

    if (restoredPersonal) {
      const normalizedPersonal = parsePersonalWorkspace(JSON.stringify(restoredPersonal));
      localStorage.setItem(
        PERSONAL_WORKSPACE_STORAGE_KEY,
        JSON.stringify(normalizedPersonal)
      );
      setPersonalWorkspace(normalizedPersonal);
    }

    const restoredSecondary = workspaces.find((workspace) => workspace.id === 'secondary');

    if (restoredSecondary) {
      const normalizedSecondary = parseSecondaryWorkspace(JSON.stringify(restoredSecondary));
      localStorage.setItem(
        SECONDARY_WORKSPACE_STORAGE_KEY,
        JSON.stringify(normalizedSecondary)
      );
      setSecondaryWorkspace(normalizedSecondary);
    }

    const restoredBacktest = workspaces.find((workspace) => workspace.id === 'backtest');

    if (restoredBacktest) {
      const normalizedBacktest = parseBacktestWorkspace(JSON.stringify(restoredBacktest));
      localStorage.setItem(
        BACKTEST_WORKSPACE_STORAGE_KEY,
        JSON.stringify(normalizedBacktest)
      );
      setBacktestWorkspace(normalizedBacktest);
    }

    const restoredBacktestSecond = workspaces.find(
      (workspace) => workspace.id === 'backtest-2'
    );

    if (restoredBacktestSecond) {
      const normalizedBacktestSecond = parseBacktestSecondWorkspace(
        JSON.stringify(restoredBacktestSecond)
      );
      localStorage.setItem(
        BACKTEST_SECOND_WORKSPACE_STORAGE_KEY,
        JSON.stringify(normalizedBacktestSecond)
      );
      setBacktestSecondWorkspace(normalizedBacktestSecond);
    }

    const restoredPreview = workspaces.find((workspace) => workspace.id === 'student');

    if (restoredPreview) {
      const normalizedPreview = parsePreviewWorkspace(JSON.stringify(restoredPreview));
      localStorage.setItem(
        PREVIEW_WORKSPACE_STORAGE_KEY,
        JSON.stringify(normalizedPreview)
      );
      setPreviewWorkspace(normalizedPreview);
    }

    const restoredPreviewSecond = workspaces.find(
      (workspace) => workspace.id === 'preview-2'
    );

    if (restoredPreviewSecond) {
      const normalizedPreviewSecond = parsePreviewSecondWorkspace(
        JSON.stringify(restoredPreviewSecond)
      );
      localStorage.setItem(
        PREVIEW_SECOND_WORKSPACE_STORAGE_KEY,
        JSON.stringify(normalizedPreviewSecond)
      );
      setPreviewSecondWorkspace(normalizedPreviewSecond);
    }

    const restored = workspaces
      .filter(
        (workspace): workspace is JournalWorkspaceMeta =>
          workspace.type === 'custom' &&
          (workspace.id.startsWith('custom-') ||
            workspace.id.startsWith('backtest-') ||
            workspace.id.startsWith('preview-')) &&
          normalizeWorkspaceName(workspace.name).length > 0
      )
      .map((workspace) => ({
        ...workspace,
        name: normalizeWorkspaceName(workspace.name),
        initialBalance: 0,
        notes: typeof workspace.notes === 'string' ? workspace.notes : '',
        group:
          workspace.group === 'preview' || workspace.id.startsWith('preview-')
            ? 'preview'
            : workspace.group === 'backtest' || workspace.id.startsWith('backtest-')
              ? 'backtest'
              : 'account',
      }))
      .slice(0, MAX_CUSTOM_WORKSPACES * 3);

    persistCustomWorkspaces(restored);
    setCustomWorkspaces(restored);
  }, []);

  return {
    workspaces: [
      // Personal and Backtest stay first in their respective filtered sections.
      personalWorkspace,
      secondaryWorkspace,
      backtestWorkspace,
      backtestSecondWorkspace,
      previewWorkspace,
      previewSecondWorkspace,
      ...customWorkspaces,
    ],
    customWorkspaces,
    maxCustomWorkspaces: MAX_CUSTOM_WORKSPACES,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    reorderCustomWorkspaces,
    restoreCustomWorkspaces,
  };
}

const getTradeDedupKey = (trade: Trade) => {
  const date = trade.exitDate?.split('T')[0] || trade.entryDate?.split('T')[0] || '';
  const time =
    trade.exitDate?.split('T')[1]?.slice(0, 5) ||
    trade.entryDate?.split('T')[1]?.slice(0, 5) ||
    '';

  return [
    date,
    time,
    trade.pair?.trim() || '',
    trade.direction || '',
    trade.pnl ?? 0,
    trade.strategy?.trim() || '',
  ].join('|');
};

const mergeJournalState = (
  currentState: JournalState,
  importedState: JournalState
): JournalState => {
  const existingTradeIds = new Set(
    currentState.trades.map((trade) => trade.id).filter(Boolean)
  );
  const existingTradeKeys = new Set(currentState.trades.map(getTradeDedupKey));
  const mergedTrades = [...currentState.trades];

  importedState.trades.forEach((trade) => {
    const tradeKey = getTradeDedupKey(trade);

    if (
      (trade.id && existingTradeIds.has(trade.id)) ||
      existingTradeKeys.has(tradeKey)
    ) {
      return;
    }

    mergedTrades.push(trade);
    if (trade.id) existingTradeIds.add(trade.id);
    existingTradeKeys.add(tradeKey);
  });

  const mergedWeeklyPlans = [...currentState.weeklyPlans];
  const existingWeekKeys = new Set(
    currentState.weeklyPlans.map((plan) => plan.weekKey)
  );

  importedState.weeklyPlans.forEach((plan) => {
    if (!existingWeekKeys.has(plan.weekKey)) {
      mergedWeeklyPlans.push(plan);
      existingWeekKeys.add(plan.weekKey);
    }
  });

  return {
    ...currentState,
    trades: mergedTrades,
    missedTrades: [...currentState.missedTrades, ...importedState.missedTrades],
    tags: Array.from(new Set([...currentState.tags, ...importedState.tags])),
    strategies: Array.from(
      new Set([...currentState.strategies, ...importedState.strategies])
    ),
    customTags: Array.from(
      new Set([...currentState.customTags, ...importedState.customTags])
    ),
    tagColors: {
      ...importedState.tagColors,
      ...currentState.tagColors,
    },
    weeklyPlans: mergedWeeklyPlans,
    settings: currentState.settings,
  };
};

export function useTrades(workspace: JournalWorkspace = 'personal') {
  const storageKey = getWorkspaceStorageKey(workspace);

  const [state, setState] = useState<JournalState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedWorkspace, setLoadedWorkspace] =
    useState<JournalWorkspace | null>(null);

  // Load from localStorage whenever the selected workspace changes
  useEffect(() => {
    setIsLoaded(false);

    try {
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        setState(parseImportedJournal(stored) || initialState);
      } else {
        setState(initialState);
      }
    } catch (error) {
      console.error('Failed to load trades from localStorage:', error);
    }
    setLoadedWorkspace(workspace);
    setIsLoaded(true);
  }, [storageKey, workspace]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (isLoaded && loadedWorkspace === workspace) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save trades to localStorage:', error);
      }
    }
  }, [state, isLoaded, loadedWorkspace, storageKey, workspace]);

  const addTrade = useCallback((trade: Trade) => {
    setState(prev => ({
      ...prev,
      trades: [
        ...prev.trades,
        { ...trade, isFavorite: trade.isFavorite ?? false },
      ],
    }));
  }, []);

  const updateTrade = useCallback((id: string, updates: Partial<Trade>) => {
    setState(prev => ({
      ...prev,
      trades: prev.trades.map(trade =>
        trade.id === id
          ? { ...trade, ...updates, updatedAt: new Date().toISOString() }
          : trade
      ),
    }));
  }, []);

  const deleteTrade = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      trades: prev.trades.filter(trade => trade.id !== id),
    }));
  }, []);

  const addMissedTrade = useCallback((missedTrade: MissedTrade) => {
    setState(prev => ({
      ...prev,
      missedTrades: [...prev.missedTrades, missedTrade],
    }));
  }, []);

  const updateMissedTrade = useCallback((
    id: string,
    updates: Partial<MissedTrade>
  ) => {
    setState(prev => ({
      ...prev,
      missedTrades: prev.missedTrades.map(missedTrade =>
        missedTrade.id === id
          ? { ...missedTrade, ...updates, updatedAt: new Date().toISOString() }
          : missedTrade
      ),
    }));
  }, []);

  const deleteMissedTrade = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      missedTrades: prev.missedTrades.filter(missedTrade => missedTrade.id !== id),
    }));
  }, []);

  const saveMissedTradesForDate = useCallback((
    dateKey: string,
    missedTrades: MissedTrade[]
  ) => {
    setState(prev => ({
      ...prev,
      missedTrades: [
        ...prev.missedTrades.filter(missedTrade => missedTrade.date !== dateKey),
        ...missedTrades,
      ],
    }));
  }, []);

  const addTag = useCallback((tag: string) => {
    setState(prev => ({
      ...prev,
      tagsInitialized: true,
      tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag],
    }));
  }, []);

  const removeTag = useCallback((tag: string) => {
    setState(prev => ({
      ...prev,
      tagsInitialized: true,
      tags: prev.tags.filter(t => t !== tag),
      customTags: prev.customTags.filter(value => value !== tag),
      tagColors: Object.fromEntries(
        Object.entries(prev.tagColors).filter(([value]) => value !== tag)
      ),
      trades: prev.trades.map(trade => ({
        ...trade,
        tags: (trade.tags || []).filter(value => value !== tag),
      })),
      missedTrades: prev.missedTrades.map(missedTrade => ({
        ...missedTrade,
        tags: (missedTrade.tags || []).filter(value => value !== tag),
      })),
    }));
  }, []);

  const addStrategy = useCallback((strategy: string) => {
    setState(prev => ({
      ...prev,
      strategies: prev.strategies.includes(strategy)
        ? prev.strategies
        : [...prev.strategies, strategy],
    }));
  }, []);

  const removeStrategy = useCallback((strategy: string) => {
    setState(prev => ({
      ...prev,
      strategies: prev.strategies.filter(s => s !== strategy),
    }));
  }, []);

  const addCustomTag = useCallback((tag: string) => {
    setState(prev => ({
      ...prev,
      customTags: prev.customTags.includes(tag)
        ? prev.customTags
        : [...prev.customTags, tag],
    }));
  }, []);

  const removeCustomTag = useCallback((tag: string) => {
    setState(prev => ({
      ...prev,
      tagsInitialized: true,
      tags: prev.tags.filter(value => value !== tag),
      customTags: prev.customTags.filter(value => value !== tag),
      tagColors: Object.fromEntries(
        Object.entries(prev.tagColors).filter(([value]) => value !== tag)
      ),
      trades: prev.trades.map(trade => ({
        ...trade,
        tags: (trade.tags || []).filter(value => value !== tag),
      })),
      missedTrades: prev.missedTrades.map(missedTrade => ({
        ...missedTrade,
        tags: (missedTrade.tags || []).filter(value => value !== tag),
      })),
    }));
  }, []);

  const updateTagColor = useCallback((tag: string, color: string) => {
    setState(prev => ({
      ...prev,
      tagColors: {
        ...prev.tagColors,
        [tag]: color,
      },
    }));
  }, []);

  const updateSettings = useCallback((settings: Partial<JournalState['settings']>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  }, []);

  const saveWeeklyPlan = useCallback((plan: WeeklyPlan) => {
    setState(prev => {
      const existingIndex = prev.weeklyPlans.findIndex(p => p.weekKey === plan.weekKey);
      if (existingIndex >= 0) {
        const updated = [...prev.weeklyPlans];
        updated[existingIndex] = plan;
        return { ...prev, weeklyPlans: updated };
      }
      return { ...prev, weeklyPlans: [...prev.weeklyPlans, plan] };
    });
  }, []);

  const getWeeklyPlan = useCallback((weekKey: string): WeeklyPlan | undefined => {
    return state.weeklyPlans.find(p => p.weekKey === weekKey);
  }, [state.weeklyPlans]);

  const exportData = useCallback((): string => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importData = useCallback((
    jsonString: string,
    targetWorkspace: JournalWorkspace = workspace
  ): boolean => {
    const importedState = parseImportedJournal(jsonString);

    if (!importedState) {
      return false;
    }

    const targetStorageKey = getWorkspaceStorageKey(targetWorkspace);

    try {
      localStorage.setItem(targetStorageKey, JSON.stringify(importedState));

      if (targetWorkspace === workspace) {
        setState(importedState);
      }

      return true;
    } catch (error) {
      console.error('Failed to import journal data:', error);
      return false;
    }
  }, [workspace]);

  const appendImportData = useCallback((
    jsonString: string,
    targetWorkspace: JournalWorkspace = workspace
  ): boolean => {
    const importedState = parseImportedJournal(jsonString);

    if (!importedState) {
      return false;
    }

    const targetStorageKey = getWorkspaceStorageKey(targetWorkspace);

    try {
      const stored = localStorage.getItem(targetStorageKey);
      const currentState =
        targetWorkspace === workspace
          ? state
          : stored
            ? parseImportedJournal(stored) || initialState
            : initialState;
      const mergedState = mergeJournalState(currentState, importedState);

      localStorage.setItem(targetStorageKey, JSON.stringify(mergedState));

      if (targetWorkspace === workspace) {
        setState(mergedState);
      }

      return true;
    } catch (error) {
      console.error('Failed to append journal data:', error);
      return false;
    }
  }, [state, workspace]);

  const clearAllData = useCallback(() => {
    setState(initialState);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const getWorkspaceData = useCallback((targetWorkspace: JournalWorkspace) => {
    if (
      targetWorkspace === workspace &&
      isLoaded &&
      loadedWorkspace === workspace
    ) {
      return state;
    }

    const stored = localStorage.getItem(
      getWorkspaceStorageKey(targetWorkspace)
    );

    return stored ? parseImportedJournal(stored) || initialState : initialState;
  }, [isLoaded, loadedWorkspace, state, workspace]);

  const clearWorkspaceData = useCallback((targetWorkspace: JournalWorkspace) => {
    localStorage.removeItem(getWorkspaceStorageKey(targetWorkspace));

    if (targetWorkspace === workspace) {
      setState(initialState);
    }
  }, [workspace]);

  const getTradesByDate = useCallback((dateKey: string): Trade[] => {
    return state.trades.filter(trade => trade.exitDate.startsWith(dateKey));
  }, [state.trades]);

  const getMissedTradesByDate = useCallback((dateKey: string): MissedTrade[] => {
    return state.missedTrades.filter(missedTrade => missedTrade.date === dateKey);
  }, [state.missedTrades]);

  const getTradeById = useCallback((id: string): Trade | undefined => {
    return state.trades.find(trade => trade.id === id);
  }, [state.trades]);

  return {
    trades: state.trades,
    missedTrades: state.missedTrades,
    tags: state.tags,
    strategies: state.strategies,
    customTags: state.customTags,
    tagColors: state.tagColors,
    weeklyPlans: state.weeklyPlans,
    settings: state.settings,
    isLoaded,
    addTrade,
    updateTrade,
    deleteTrade,
    addMissedTrade,
    updateMissedTrade,
    deleteMissedTrade,
    saveMissedTradesForDate,
    addTag,
    removeTag,
    addStrategy,
    removeStrategy,
    addCustomTag,
    removeCustomTag,
    updateTagColor,
    updateSettings,
    saveWeeklyPlan,
    getWeeklyPlan,
    exportData,
    importData,
    appendImportData,
    clearAllData,
    getWorkspaceData,
    clearWorkspaceData,
    getTradesByDate,
    getMissedTradesByDate,
    getTradeById,
  };
}
