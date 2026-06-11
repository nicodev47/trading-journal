'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { Trade } from '@/lib/types/trade';

interface AdvancedStatsGridProps {
  trades: Trade[];
}

export function AdvancedStatsGrid({ trades }: AdvancedStatsGridProps) {
  const data = useMemo(() => {
    const winningTrades = trades.filter((trade) => trade.pnl > 0);
    const losingTrades = trades.filter((trade) => trade.pnl < 0);
    const longTrades = trades.filter((trade) => trade.direction === 'long').length;
    const shortTrades = trades.filter((trade) => trade.direction === 'short').length;
    const pnlByDay = new Map<string, number>();
    const tradesByDay = new Map<string, number>();
    const setupStats = new Map<string, { trades: number; wins: number }>();
    let sessionStartPnl = 0;
    let sessionEndPnl = 0;
    let sessionStartTrades = 0;
    let sessionEndTrades = 0;

    trades.forEach((trade) => {
      const date = trade.exitDate.split('T')[0];
      pnlByDay.set(date, (pnlByDay.get(date) ?? 0) + trade.pnl);
      tradesByDay.set(date, (tradesByDay.get(date) ?? 0) + 1);

      const setup = trade.strategy.trim();
      if (setup) {
        const stats = setupStats.get(setup) ?? { trades: 0, wins: 0 };
        stats.trades += 1;
        if (trade.pnl > 0) stats.wins += 1;
        setupStats.set(setup, stats);
      }

      const time = trade.entryDate.split('T')[1]?.slice(0, 5);

      if (time) {
        const [hours, minutes] = time.split(':').map(Number);
        const timeInMinutes = hours * 60 + minutes;

        if (timeInMinutes >= 15 * 60 + 30 && timeInMinutes < 15 * 60 + 50) {
          sessionStartPnl += trade.pnl;
          sessionStartTrades += 1;
        } else if (
          timeInMinutes >= 15 * 60 + 50 &&
          timeInMinutes <= 16 * 60 + 10
        ) {
          sessionEndPnl += trade.pnl;
          sessionEndTrades += 1;
        }
      }
    });

    const grossWins = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLosses = Math.abs(
      losingTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    );

    let currentStreak = 0;
    let currentStreakType: 'win' | 'loss' | 'none' = 'none';
    let positiveStreak = 0;
    let longestPositiveStreak = 0;
    const tradingDays = tradesByDay.size;
    const newYorkSessionTrades = sessionStartTrades + sessionEndTrades;
    const bestNewYorkWindow =
      newYorkSessionTrades === 0
        ? null
        : sessionStartPnl === sessionEndPnl
          ? 'Pari'
          : sessionStartPnl > sessionEndPnl
            ? 'Inizio sessione'
            : 'Fine sessione';
    const bestSetup = Array.from(setupStats.entries()).reduce<{
      name: string | null;
      trades: number;
      winRate: number;
    }>(
      (best, [name, stats]) => {
        const winRate = (stats.wins / stats.trades) * 100;

        if (
          winRate > best.winRate ||
          (winRate === best.winRate && stats.trades > best.trades)
        ) {
          return { name, trades: stats.trades, winRate };
        }

        return best;
      },
      { name: null, trades: 0, winRate: -1 }
    );
    const sortedDailyPnl = Array.from(pnlByDay.entries()).sort(
      ([dateA], [dateB]) => dateA.localeCompare(dateB)
    );

    for (const [, pnl] of sortedDailyPnl) {
      if (pnl > 0) {
        positiveStreak += 1;
        longestPositiveStreak = Math.max(
          longestPositiveStreak,
          positiveStreak
        );

        if (currentStreakType === 'win') {
          currentStreak += 1;
        } else {
          currentStreak = 1;
          currentStreakType = 'win';
        }
      } else if (pnl < 0) {
        positiveStreak = 0;

        if (currentStreakType === 'loss') {
          currentStreak += 1;
        } else {
          currentStreak = 1;
          currentStreakType = 'loss';
        }
      }
    }

    return {
      avgWin: winningTrades.length ? grossWins / winningTrades.length : 0,
      avgLoss: losingTrades.length ? grossLosses / losingTrades.length : 0,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      longTrades,
      shortTrades,
      tradingDays,
      bestNewYorkWindow,
      bestSetup,
      currentStreak,
      currentStreakType,
      longestPositiveStreak,
    };
  }, [trades]);

  const formatCurrency = (value: number) =>
    `${value.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`;

  return (
    <div className="grid grid-cols-1 items-start gap-4 py-4 md:grid-cols-2 xl:grid-cols-3">
      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[148px] flex-col justify-center p-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Giorni operativi
          </p>

          <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-foreground">
            <span className="text-profit">{data.tradingDays}</span>{' '}
            {data.tradingDays === 1 ? 'giorno' : 'giorni'}
          </p>

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {trades.length} {trades.length === 1 ? 'trade eseguito' : 'trade eseguiti'}
          </p>

          <div className="mt-4 h-1.5 w-full rounded-full bg-profit/80" />
        </CardContent>
      </Card>

      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[148px] flex-col justify-center p-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Serie attuale
          </p>

          <p
            className={`mt-3 font-mono text-2xl font-bold tracking-tight ${
              data.currentStreakType === 'loss' ? 'text-loss' : 'text-profit'
            }`}
          >
            {data.currentStreak}{' '}
            {data.currentStreakType === 'loss' ? 'loss' : 'win'}
            {data.currentStreakType === 'win' && data.currentStreak >= 3 && ' 🔥'}
          </p>

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Migliore: {data.longestPositiveStreak} win
          </p>

          <div
            className={`mt-4 h-1.5 w-full rounded-full ${
              data.currentStreakType === 'loss' ? 'bg-loss/80' : 'bg-profit/80'
            }`}
          />
        </CardContent>
      </Card>

      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[148px] flex-col justify-center p-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Media win / Media loss
          </p>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono font-bold tracking-tight">
            <span className="text-[clamp(1.15rem,1.8vw,1.5rem)] text-profit">
              {formatCurrency(data.avgWin)}
            </span>
            <span className="text-[clamp(1.15rem,1.8vw,1.5rem)] text-foreground">
              /
            </span>
            <span className="text-[clamp(1.15rem,1.8vw,1.5rem)] text-loss">
              {formatCurrency(data.avgLoss)}
            </span>
          </div>

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {data.winningTrades} win / {data.losingTrades} loss
          </p>

          <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-profit transition-all"
              style={{
                width: `${
                  data.avgWin + data.avgLoss
                    ? (data.avgWin / (data.avgWin + data.avgLoss)) * 100
                    : 0
                }%`,
              }}
            />
            <div
              className="h-full bg-loss transition-all"
              style={{
                width: `${
                  data.avgWin + data.avgLoss
                    ? (data.avgLoss / (data.avgWin + data.avgLoss)) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[148px] flex-col justify-center p-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Finestra operativa migliore
          </p>

          <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-profit">
            {data.bestNewYorkWindow ?? '—'}
          </p>

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {data.bestNewYorkWindow
              ? 'Sessione New York 15:30–16:10'
              : 'Nessun dato nella sessione New York'}
          </p>

          <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-1/2 bg-profit/80" />
            <div className="h-full w-1/2 bg-profit/35" />
          </div>
        </CardContent>
      </Card>

      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[148px] flex-col justify-center p-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Setup migliore
          </p>

          <p className="mt-3 truncate font-mono text-2xl font-bold tracking-tight text-profit">
            {data.bestSetup.name ?? '—'}
          </p>

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {data.bestSetup.name
              ? `${data.bestSetup.winRate.toFixed(0)}% win rate · ${
                  data.bestSetup.trades
                } trade`
              : 'Nessun setup registrato'}
          </p>

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-profit transition-all"
              style={{
                width: `${
                  data.bestSetup.name ? data.bestSetup.winRate : 0
                }%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[148px] flex-col justify-center p-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Long vs Short
          </p>

          <div className="mt-3 flex items-baseline gap-2 font-mono font-bold tracking-tight">
            <span className="text-2xl text-profit">{data.longTrades} long</span>
            <span className="text-2xl text-foreground">/</span>
            <span className="text-2xl text-loss">{data.shortTrades} short</span>
          </div>

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {data.longTrades + data.shortTrades} posizioni totali
          </p>

          <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-profit transition-all"
              style={{
                width: `${
                  data.longTrades + data.shortTrades
                    ? (data.longTrades / (data.longTrades + data.shortTrades)) * 100
                    : 0
                }%`,
              }}
            />
            <div
              className="h-full bg-loss transition-all"
              style={{
                width: `${
                  data.longTrades + data.shortTrades
                    ? (data.shortTrades / (data.longTrades + data.shortTrades)) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
