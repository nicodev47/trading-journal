import type { Trade } from '../types/trade';
import { isValidStatTrade } from '../calculations.ts';
import { balanceUpdatesToDays } from './engine.ts';
import type { DayResult, PropAccount } from './types.ts';

const dayOf = (trade: Trade) => (trade.exitDate || trade.entryDate || '').split('T')[0];

/** Net result per trading day, from the start date on. Zero-P&L trades are ignored. */
export function tradesToDays(trades: Trade[], startDate: string): DayResult[] {
  const days = new Map<string, number>();

  trades.filter(isValidStatTrade).forEach(trade => {
    const date = dayOf(trade);

    if (!date || date < startDate) return;

    days.set(date, (days.get(date) ?? 0) + trade.pnl - trade.commission);
  });

  return Array.from(days.entries())
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Daily results of an account, whether it follows a journal or is updated by hand. */
export function getAccountDays(
  account: PropAccount,
  getJournalTrades: (journalId: string) => Trade[]
): DayResult[] {
  if (account.source.kind === 'manual') {
    return balanceUpdatesToDays(
      account.size,
      account.balanceUpdates.filter(update => update.date >= account.startDate)
    );
  }

  // Trades assigned to specific prop accounts only count for those; unassigned ones count for every account of the journal.
  const trades = getJournalTrades(account.source.journalId).filter(
    trade => !trade.propAccountIds?.length || trade.propAccountIds.includes(account.id)
  );

  return tradesToDays(trades, account.startDate);
}
