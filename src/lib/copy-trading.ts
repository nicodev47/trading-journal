import type { Trade } from './types/trade.ts';

/** Id of the copy of a trade in another account's journal. */
export const copyIdFor = (tradeId: string, targetId: string) => `copy-${tradeId}-${targetId}`;

/**
 * Brings a target journal in line with the trades of the source day:
 * every earlier copy of those trades is dropped, then fresh copies are
 * added when the account is still selected.
 */
export function syncCopies(
  targetTrades: Trade[],
  sourceIds: string[],
  sourceTrades: Trade[],
  targetId: string,
  selected: boolean
): Trade[] {
  const known = new Set(sourceIds);
  const kept = targetTrades.filter(trade => !(trade.copySourceId && known.has(trade.copySourceId)));

  if (!selected) return kept;

  const copies = sourceTrades.map(trade => ({
    ...trade,
    id: copyIdFor(trade.id, targetId),
    copySourceId: trade.id,
    copiedTo: undefined,
  }));

  return [...kept, ...copies];
}

/** Accounts a day of trades was copied to (union over its trades). */
export const getCopiedTo = (trades: Trade[]) =>
  Array.from(new Set(trades.flatMap(trade => trade.copiedTo ?? [])));
