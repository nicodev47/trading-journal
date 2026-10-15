import type { Trade } from './types/trade';
import { calculateWinRate, getTradeOutcome, isValidStatTrade } from './calculations.ts';

export const NO_SETUP_LABEL = 'Senza Setup';

export interface StrategyRow {
  name: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  avgWin: number;
  avgLoss: number;
  /** null when there are no losses (infinite) or no trades. */
  profitFactor: number | null;
}

/** One row per setup, best P&L first. Missed (zero P&L) trades are ignored. */
export function getStrategyRows(trades: Trade[]): StrategyRow[] {
  const groups = new Map<string, Trade[]>();

  trades.filter(isValidStatTrade).forEach(trade => {
    const name = trade.strategy?.trim() || NO_SETUP_LABEL;

    groups.set(name, [...(groups.get(name) ?? []), trade]);
  });

  return Array.from(groups.entries())
    .map(([name, items]) => {
      const net = (trade: Trade) => trade.pnl - trade.commission;
      const wins = items.filter(trade => getTradeOutcome(trade) === 'win');
      const losses = items.filter(trade => getTradeOutcome(trade) === 'loss');
      const grossProfit = wins.reduce((sum, trade) => sum + net(trade), 0);
      const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + net(trade), 0));

      return {
        name,
        trades: items.length,
        wins: wins.length,
        losses: losses.length,
        winRate: calculateWinRate(wins.length, losses.length),
        pnl: items.reduce((sum, trade) => sum + net(trade), 0),
        avgWin: wins.length ? grossProfit / wins.length : 0,
        avgLoss: losses.length ? grossLoss / losses.length : 0,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
      };
    })
    .sort((a, b) => b.pnl - a.pnl || b.trades - a.trades);
}
