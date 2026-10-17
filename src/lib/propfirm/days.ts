import type { Trade } from '../types/trade';
import { isValidStatTrade } from '../calculations.ts';
import { balanceUpdatesToDays } from './engine.ts';
import type { DayResult, PropAccount } from './types.ts';

const dayOf = (trade: Trade) => (trade.exitDate || trade.entryDate || '').split('T')[0];

/** Net result per trading day, from the start date on. Zero-P&L trades are ignored. */
export function tradesToDays(trades: Trade[], startDate: string, endDate?: string): DayResult[] {
  const days = new Map<string, number>();

  trades.filter(isValidStatTrade).forEach(trade => {
    const date = dayOf(trade);

    if (!date || date < startDate || (endDate && date > endDate)) return;

    days.set(date, (days.get(date) ?? 0) + trade.pnl - trade.commission);
  });

  return Array.from(days.entries())
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Balance the account starts from: the plan size, or 0 on a live account. */
export const startBalanceOf = (account: PropAccount) => account.rules?.startBalance ?? account.size;

/** Daily results of an account, whether it follows a journal or is updated by hand. */
export function getAccountDays(
  account: PropAccount,
  getJournalTrades: (journalId: string) => Trade[]
): DayResult[] {
  if (account.source.kind === 'manual') {
    return balanceUpdatesToDays(
      startBalanceOf(account),
      account.balanceUpdates.filter(update => update.date >= account.startDate)
    );
  }

  // Trades the user assigned to this account always count, even before its start date;
  // unassigned ones count for every account of the journal, from the start date on.
  const journalTrades = getJournalTrades(account.source.journalId);
  const assigned = journalTrades.filter(trade => trade.propAccountIds?.includes(account.id));
  const unassigned = tradesToDays(
    journalTrades.filter(trade => !trade.propAccountIds?.length),
    account.startDate,
    account.endDate
  );
  const merged = new Map<string, number>();

  [...tradesToDays(assigned, '0000-00-00'), ...unassigned].forEach(day =>
    merged.set(day.date, (merged.get(day.date) ?? 0) + day.pnl)
  );

  return Array.from(merged.entries())
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Trades that count for a journal-linked account (see getAccountDays), newest first. */
export function getAccountTrades(
  account: PropAccount,
  getJournalTrades: (journalId: string) => Trade[]
): Trade[] {
  if (account.source.kind === 'manual') return [];

  return getJournalTrades(account.source.journalId)
    .filter(trade => isValidStatTrade(trade))
    .filter(trade => {
      if (trade.propAccountIds?.length) return trade.propAccountIds.includes(account.id);

      return dayOf(trade) >= account.startDate;
    })
    .sort((a, b) => (b.exitDate || b.entryDate).localeCompare(a.exitDate || a.entryDate));
}
