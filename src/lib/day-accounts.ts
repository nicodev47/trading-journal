import type { Trade } from './types/trade.ts';

/** Accounts a stored trade belongs to: the ones it was entered for, else the journal it lives in. */
export const getTradeAccounts = (trade: Trade, workspaceId: string) =>
  trade.accounts?.length ? trade.accounts : [workspaceId];

export interface StoredTrade {
  workspaceId: string;
  trade: Trade;
}

/**
 * One row per executed trade: the same trade stored on several accounts
 * (same id in each journal) is shown once, with all its accounts.
 */
export function groupByTrade(instances: StoredTrade[]): Trade[] {
  const groups = new Map<string, { trade: Trade; accounts: string[] }>();

  instances.forEach(({ workspaceId, trade }) => {
    const group = groups.get(trade.id);

    if (group) {
      if (!group.accounts.includes(workspaceId)) group.accounts.push(workspaceId);
    } else {
      groups.set(trade.id, { trade, accounts: [workspaceId] });
    }
  });

  return Array.from(groups.values()).map(({ trade, accounts }) => ({ ...trade, accounts }));
}

/**
 * New trade list of one journal after a day was edited: the trades that were
 * loaded in the editor are replaced by the rows that include this account.
 */
export function applyDayRows(
  current: Trade[],
  loadedIds: string[],
  rows: Trade[],
  workspaceId: string
): Trade[] {
  const loaded = new Set(loadedIds);
  const kept = current.filter(trade => !loaded.has(trade.id));
  const mine = rows
    .filter(row => (row.accounts?.length ? row.accounts : [workspaceId]).includes(workspaceId))
    .map(row => ({ ...row }));

  return [...kept, ...mine];
}
