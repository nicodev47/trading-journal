import type {
  JournalWorkspace,
  JournalWorkspaceMeta,
} from '@/hooks/use-trades';
import type { JournalState, Trade } from './types/trade';

export const JOURNAL_EXPORT_FORMAT_VERSION = 1;

export interface JournalExportMetadata {
  formatVersion: number;
  exportType: 'workspace' | 'full-backup';
  exportedAt: string;
  sourceWorkspace?: JournalWorkspace;
  workspaceName?: string;
  workspaceNotes?: string;
  workspaceGroup?: JournalWorkspaceMeta['group'];
}

export type WorkspaceJournalExport = JournalState & {
  exportMetadata: JournalExportMetadata;
};

export interface FullJournalBackup {
  exportMetadata: JournalExportMetadata;
  workspaces: Partial<Record<JournalWorkspace, JournalState>>;
  workspaceOptions: JournalWorkspaceMeta[];
}

export type ParsedJournalExport =
  | { kind: 'workspace'; data: Record<string, unknown> }
  | { kind: 'full-backup'; data: FullJournalBackup };

interface TradeDateRange {
  earliest: Date;
  latest: Date;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isJournalStateLike = (value: unknown): value is JournalState =>
  isRecord(value) && Array.isArray(value.trades);

const getValidTradeDate = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTradeDateRange = (
  trades: Array<Trade | Record<string, unknown>>
): TradeDateRange | null => {
  let earliest: Date | null = null;
  let latest: Date | null = null;

  trades.forEach((trade) => {
    const dates = [
      getValidTradeDate(trade.exitDate),
      getValidTradeDate(trade.entryDate),
    ].filter((date): date is Date => date !== null);

    dates.forEach((date) => {
      if (!earliest || date.getTime() < earliest.getTime()) earliest = date;
      if (!latest || date.getTime() > latest.getTime()) latest = date;
    });
  });

  return earliest && latest ? { earliest, latest } : null;
};

const getMonthStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

export function getAppendImportTargetMonth(
  jsonString: string,
  existingTrades: Trade[]
): Date | null {
  const parsed = parseJournalExport(jsonString);
  if (parsed?.kind !== 'workspace' || !Array.isArray(parsed.data.trades)) {
    return null;
  }

  const importedTrades = parsed.data.trades.filter(isRecord);
  const importedRange = getTradeDateRange(importedTrades);
  if (!importedRange) return null;

  const existingRange = getTradeDateRange(existingTrades);
  if (!existingRange) return getMonthStart(importedRange.earliest);

  if (importedRange.earliest.getTime() < existingRange.earliest.getTime()) {
    return getMonthStart(importedRange.earliest);
  }

  if (importedRange.latest.getTime() > existingRange.latest.getTime()) {
    return getMonthStart(importedRange.latest);
  }

  return getMonthStart(importedRange.earliest);
}

export function createWorkspaceExportData(
  workspace: JournalWorkspace,
  data: JournalState,
  exportedAt = new Date(),
  workspaceMetadata?: JournalWorkspaceMeta
): string {
  const payload: WorkspaceJournalExport = {
    ...data,
    exportMetadata: {
      formatVersion: JOURNAL_EXPORT_FORMAT_VERSION,
      exportType: 'workspace',
      sourceWorkspace: workspace,
      exportedAt: exportedAt.toISOString(),
      workspaceName: workspaceMetadata?.name,
      workspaceNotes: workspaceMetadata?.notes,
      workspaceGroup: workspaceMetadata?.group,
    },
  };

  return JSON.stringify(payload, null, 2);
}

export function createFullBackupExportData(
  workspaces: Partial<Record<JournalWorkspace, JournalState>>,
  workspaceOptions: JournalWorkspaceMeta[],
  exportedAt = new Date()
): string {
  const includedWorkspaceIds = new Set(Object.keys(workspaces));
  const payload: FullJournalBackup = {
    exportMetadata: {
      formatVersion: JOURNAL_EXPORT_FORMAT_VERSION,
      exportType: 'full-backup',
      exportedAt: exportedAt.toISOString(),
    },
    workspaces,
    workspaceOptions: workspaceOptions.filter((workspace) =>
      includedWorkspaceIds.has(workspace.id)
    ),
  };

  return JSON.stringify(payload, null, 2);
}

export function parseJournalExport(jsonString: string): ParsedJournalExport | null {
  try {
    const parsed: unknown = JSON.parse(jsonString);
    if (!isRecord(parsed)) return null;

    if (isJournalStateLike(parsed)) {
      return { kind: 'workspace', data: parsed };
    }

    const metadata = parsed.exportMetadata;
    const rawWorkspaces = parsed.workspaces;
    if (
      !isRecord(metadata) ||
      metadata.exportType !== 'full-backup' ||
      !isRecord(rawWorkspaces)
    ) {
      return null;
    }

    const workspaces = Object.fromEntries(
      Object.entries(rawWorkspaces).filter(([, data]) => isJournalStateLike(data))
    ) as Partial<Record<JournalWorkspace, JournalState>>;

    if (Object.keys(workspaces).length === 0) return null;

    const workspaceOptions = Array.isArray(parsed.workspaceOptions)
      ? parsed.workspaceOptions.filter(
          (item): item is JournalWorkspaceMeta =>
            isRecord(item) &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            (item.type === 'system' || item.type === 'custom')
        )
          .map((item) => ({
            ...item,
            initialBalance: 0,
          }))
      : [];

    return {
      kind: 'full-backup',
      data: {
        exportMetadata: metadata as unknown as JournalExportMetadata,
        workspaces,
        workspaceOptions,
      },
    };
  } catch {
    return null;
  }
}
