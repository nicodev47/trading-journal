import type { Trade } from '../types/trade';
import { getAccountDays } from './days.ts';
import { getFirm } from './firms.ts';
import type { PropAccount } from './types.ts';

export interface PropMarker {
  id: string;
  initials: string;
  tile: string;
  logo?: string;
  logoOnDark?: boolean;
}

/** Prop accounts on which something was executed, day by day (YYYY-MM-DD). */
export function buildPropMarkers(
  accounts: PropAccount[],
  getJournalTrades: (journalId: string) => Trade[]
): Map<string, PropMarker[]> {
  const map = new Map<string, PropMarker[]>();

  accounts.forEach(account => {
    const firm = getFirm(account.firmId);

    getAccountDays(account, getJournalTrades).forEach(day => {
      map.set(day.date, [
        ...(map.get(day.date) ?? []),
        {
          id: account.id,
          initials: firm?.initials ?? account.firmName.slice(0, 2).toUpperCase(),
          logo: firm?.logo,
          logoOnDark: firm?.logoOnDark,
          tile: firm?.tile ?? 'from-[#2a2a2d] to-[#1f1f22] border-white/10',
        },
      ]);
    });
  });

  return map;
}
