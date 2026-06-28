'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getBestOperatingWindow } from '@/lib/operating-windows';
import { isValidTradeSetup, type Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { cn } from '@/lib/utils';

interface AdvancedStatsGridProps {
  trades: Trade[];
  extended?: boolean;
}

const WEEKDAY_NAMES = [
  'Domenica',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
] as const;

export function AdvancedStatsGrid({
  trades,
  extended = false,
}: AdvancedStatsGridProps) {
  const { streamerMode } = useStreamerMode();
  const data = useMemo(() => {
    const winningTrades = trades.filter((trade) => trade.pnl > 0);
    const losingTrades = trades.filter((trade) => trade.pnl < 0);
    const longTrades = trades.filter((trade) => trade.direction === 'long').length;
    const shortTrades = trades.filter((trade) => trade.direction === 'short').length;
    const pnlByDay = new Map<string, number>();
    const tradesByDay = new Map<string, number>();
    const setupStats = new Map<string, { trades: number; wins: number }>();
    const weekdayStats = new Map<
      number,
      { trades: number; wins: number; pnl: number }
    >();

    trades.forEach((trade) => {
      const date = trade.exitDate.split('T')[0];
      const netPnl = trade.pnl - trade.commission;
      pnlByDay.set(date, (pnlByDay.get(date) ?? 0) + trade.pnl);
      tradesByDay.set(date, (tradesByDay.get(date) ?? 0) + 1);
      const tradeDate = new Date(trade.exitDate);

      if (!Number.isNaN(tradeDate.getTime())) {
        const weekday = tradeDate.getDay();
        const stats = weekdayStats.get(weekday) ?? {
          trades: 0,
          wins: 0,
          pnl: 0,
        };
        stats.trades += 1;
        stats.pnl += netPnl;
        if (netPnl > 0) stats.wins += 1;
        weekdayStats.set(weekday, stats);
      }

      const rawSetup = trade.strategy.trim();
      const setup = isValidTradeSetup(rawSetup) ? rawSetup : rawSetup ? 'Legacy' : '';
      if (setup) {
        const stats = setupStats.get(setup) ?? { trades: 0, wins: 0 };
        stats.trades += 1;
        if (trade.pnl > 0) stats.wins += 1;
        setupStats.set(setup, stats);
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
    const bestOperatingWindow = getBestOperatingWindow(trades);
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
    const longTradeList = trades.filter(
      (trade) => trade.direction === 'long'
    );
    const shortTradeList = trades.filter(
      (trade) => trade.direction === 'short'
    );
    const weekdayPerformance = Array.from(weekdayStats.entries()).map(
      ([weekday, stats]) => ({
        name: WEEKDAY_NAMES[weekday],
        trades: stats.trades,
        winRate: (stats.wins / stats.trades) * 100,
        pnl: stats.pnl,
      })
    );
    const bestWeekday = [...weekdayPerformance].sort(
      (a, b) =>
        b.winRate - a.winRate ||
        b.trades - a.trades ||
        b.pnl - a.pnl
    )[0];

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
      bestOperatingWindow,
      bestSetup,
      currentStreak,
      currentStreakType,
      longestPositiveStreak,
      longWinRate: longTradeList.length
        ? (longTradeList.filter((trade) => trade.pnl - trade.commission > 0)
            .length /
            longTradeList.length) *
          100
        : 0,
      shortWinRate: shortTradeList.length
        ? (shortTradeList.filter((trade) => trade.pnl - trade.commission > 0)
            .length /
            shortTradeList.length) *
          100
        : 0,
      bestWeekday,
    };
  }, [trades]);

  const formatCurrency = (value: number) =>
    `${value.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`;

  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-3 py-3 md:grid-cols-2 md:gap-4 md:py-4 xl:grid-cols-3',
        extended && '[&_[data-slot=card-content]]:!min-h-[124px]'
      )}
    >
      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[112px] min-w-0 flex-col justify-center p-3.5 md:min-h-[148px] md:p-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">
            Giorni operativi
          </p>

          <p className="mt-2 font-mono text-xl font-bold tracking-tight text-foreground md:mt-3 md:text-2xl">
            <span className="text-profit">{data.tradingDays}</span>{' '}
            {data.tradingDays === 1 ? 'giorno' : 'giorni'}
          </p>

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {trades.length} {trades.length === 1 ? 'trade eseguito' : 'trade eseguiti'}
          </p>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary md:mt-4">
            <div
              className="h-full rounded-full bg-profit/80 transition-all"
              style={{ width: data.tradingDays > 0 ? '100%' : '0%' }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[112px] min-w-0 flex-col justify-center p-3.5 md:min-h-[148px] md:p-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">
            Serie attuale
          </p>

          <p
            className={`mt-2 font-mono text-xl font-bold tracking-tight md:mt-3 md:text-2xl ${
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

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary md:mt-4">
            <div
              className={`h-full rounded-full transition-all ${
                data.currentStreakType === 'loss'
                  ? 'bg-loss/80'
                  : 'bg-profit/80'
              }`}
              style={{ width: data.currentStreak > 0 ? '100%' : '0%' }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[112px] min-w-0 flex-col justify-center p-3.5 md:min-h-[148px] md:p-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">
            Media win / Media loss
          </p>

          <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 font-mono font-bold tracking-tight md:mt-3">
            <span className="text-[clamp(1.15rem,1.8vw,1.5rem)] text-profit">
              {streamerMode ? '******' : formatCurrency(data.avgWin)}
            </span>
            <span className="text-[clamp(1.15rem,1.8vw,1.5rem)] text-foreground">
              /
            </span>
            <span className="text-[clamp(1.15rem,1.8vw,1.5rem)] text-loss">
              {streamerMode ? '******' : formatCurrency(data.avgLoss)}
            </span>
          </div>

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {data.winningTrades} win / {data.losingTrades} loss
          </p>

          <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-secondary md:mt-4">
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
        <CardContent className="flex min-h-[112px] min-w-0 flex-col justify-center p-3.5 md:min-h-[148px] md:p-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">
            Finestra operativa migliore
          </p>

          <p className="mt-2 break-words font-mono text-xl font-bold tracking-tight text-profit md:mt-3 md:text-2xl">
            {data.bestOperatingWindow?.name ?? '—'}
          </p>

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {data.bestOperatingWindow?.description ?? 'Nessun trade registrato'}
          </p>

          <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-secondary md:mt-4">
            {data.bestOperatingWindow && (
              <div className="h-full w-full rounded-full bg-profit/80" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[112px] min-w-0 flex-col justify-center p-3.5 md:min-h-[148px] md:p-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">
            Setup migliore
          </p>

          <p className="mt-2 truncate font-mono text-xl font-bold tracking-tight text-profit md:mt-3 md:text-2xl">
            {data.bestSetup.name ?? '—'}
          </p>

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {data.bestSetup.name
              ? `${data.bestSetup.winRate.toFixed(0)}% win rate · ${
                  data.bestSetup.trades
                } trade`
              : 'Nessun setup registrato'}
          </p>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary md:mt-4">
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
        <CardContent className="flex min-h-[112px] min-w-0 flex-col justify-center p-3.5 md:min-h-[148px] md:p-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">
            Long vs Short
          </p>

          <div className="mt-2 flex flex-wrap items-baseline gap-2 font-mono font-bold tracking-tight md:mt-3">
            <span className="text-xl text-profit md:text-2xl">{data.longTrades} long</span>
            <span className="text-xl text-foreground md:text-2xl">/</span>
            <span className="text-xl text-loss md:text-2xl">{data.shortTrades} short</span>
          </div>

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {data.longTrades + data.shortTrades} posizioni totali
          </p>

          <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-secondary md:mt-4">
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

      {extended && (
        <>
          <CompactAnalysisCard
            title="Winrate Long"
            value={data.longTrades ? `${data.longWinRate.toFixed(0)}%` : '—'}
            subtitle={`${data.longTrades} trade long`}
            tone="profit"
            progress={data.longTrades > 0 ? data.longWinRate : 0}
          />

          <CompactAnalysisCard
            title="Winrate Short"
            value={data.shortTrades ? `${data.shortWinRate.toFixed(0)}%` : '—'}
            subtitle={`${data.shortTrades} trade short`}
            tone={data.shortWinRate >= 50 ? 'profit' : 'loss'}
            progress={data.shortTrades > 0 ? data.shortWinRate : 0}
          />

          <CompactAnalysisCard
            title="Giorno più performante"
            value={data.bestWeekday?.name ?? '—'}
            subtitle={
              data.bestWeekday
                ? `${data.bestWeekday.winRate.toFixed(0)}% WR · ${
                    data.bestWeekday.trades
                  } trade`
                : 'Nessun trade registrato'
            }
            tone="profit"
            progress={data.bestWeekday?.winRate ?? 0}
          />
        </>
      )}

    </div>
  );
}

function CompactAnalysisCard({
  title,
  value,
  subtitle,
  tone,
  progress,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: 'profit' | 'loss';
  progress: number;
}) {
  return (
    <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
      <CardContent className="flex min-h-[104px] min-w-0 flex-col justify-center p-3.5 md:min-h-[124px] md:p-4">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">
          {title}
        </p>
        <p
          className={`mt-2 truncate font-mono text-lg font-bold tracking-tight md:mt-3 md:text-xl ${
            tone === 'profit' ? 'text-profit' : 'text-loss'
          }`}
        >
          {value}
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {subtitle}
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all ${
              tone === 'profit' ? 'bg-profit/80' : 'bg-loss/80'
            }`}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
