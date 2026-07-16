import type { JournalWorkspace } from '@/hooks/use-trades';
import type { Trade } from '@/lib/types/trade';

export const PROFILE_NAME_KEY = 'eclipse-trading-journal-profile-name';

const FALLBACK_TRADER_NAME = 'eclipsejournal';

export function normalizeExportName(value: string, fallback = FALLBACK_TRADER_NAME) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

export function getWorkspaceExportSlug(workspace: JournalWorkspace, workspaceName?: string) {
  switch (workspace) {
    case 'personal':
      return 'personale';
    case 'backtest':
      return 'backtest';
    case 'student':
      return 'preview';
    default:
      return normalizeExportName(workspaceName || workspace, 'workspace');
  }
}

export function getExportDateSlug(date = new Date(), includeYear = false) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return includeYear ? `${day}-${month}-${year}` : `${day}-${month}`;
}

export type GuidedExportTarget = JournalWorkspace | 'full-backup';

export function getGuidedExportBaseName(
  target: GuidedExportTarget,
  date = new Date()
) {
  const targetSlug = target === 'full-backup'
    ? 'backup-completo'
    : getWorkspaceExportSlug(target);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `eclipsejournal-${targetSlug}-${year}-${month}-${day}`;
}

export function getProfileExportName() {
  try {
    return normalizeExportName(localStorage.getItem(PROFILE_NAME_KEY) || '');
  } catch {
    return FALLBACK_TRADER_NAME;
  }
}

function getTradeOperationalDate(trade: Trade) {
  const legacyTrade = trade as Trade & { date?: string };
  const rawDate =
    legacyTrade.exitDate ||
    legacyTrade.entryDate ||
    legacyTrade.date ||
    legacyTrade.createdAt ||
    '';
  const datePart = rawDate.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);

  if (year && month && day) {
    return new Date(year, month - 1, day);
  }

  const parsedDate = new Date(rawDate);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getFirstTradeDate(trades: Trade[]) {
  return trades
    .map(getTradeOperationalDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0];
}

export function getDefaultExportBaseName(
  workspace: JournalWorkspace,
  trades: Trade[] = [],
  workspaceName?: string
) {
  const exportDate =
    workspace === 'backtest' ? getFirstTradeDate(trades) ?? new Date() : new Date();

  return [
    getProfileExportName(),
    getWorkspaceExportSlug(workspace, workspaceName),
    'backup',
    getExportDateSlug(exportDate, workspace === 'backtest'),
  ].join('-');
}

export function normalizeExportFileName(value: string, fallbackBaseName: string) {
  const withoutExtension = value.trim().replace(/(?:\.json)+$/i, '');
  const normalized = normalizeExportName(withoutExtension, fallbackBaseName);

  return `${normalized}.json`;
}
