'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getBestOperatingWindow } from '@/lib/operating-windows';
import { isValidTradeSetup, type Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { cn } from '@/lib/utils';
import {
  getRiskRewardCardPresentation,
  RiskRewardCard,
} from './profit-factor-card';
import { StatisticsCardGrid } from './statistics-card-grid';
import {
  calculateMaxDrawdown,
  calculateRiskRewardRatio,
  calculateStatistics,
  calculateWinRate,
  getTradeOutcome,
  isValidStatTrade,
} from '@/lib/calculations';

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
    const validTrades = trades.filter(isValidStatTrade);
    const winningTrades = validTrades.filter((trade) => getTradeOutcome(trade) === 'win');
    const losingTrades = validTrades.filter((trade) => getTradeOutcome(trade) === 'loss');
    const tradeStatistics = calculateStatistics(trades);
    const longTrades = validTrades.filter((trade) => trade.direction === 'long').length;
    const shortTrades = validTrades.filter((trade) => trade.direction === 'short').length;
    const tradesByDay = new Map<string, number>();
    const setupStats = new Map<string, { trades: number; wins: number; losses: number }>();
    const weekdayStats = new Map<
      number,
      { trades: number; wins: number; losses: number; pnl: number }
    >();

    validTrades.forEach((trade) => {
      const date = trade.exitDate.split('T')[0];
      const netPnl = trade.pnl - trade.commission;
      tradesByDay.set(date, (tradesByDay.get(date) ?? 0) + 1);
      const tradeDate = new Date(trade.exitDate);

      if (!Number.isNaN(tradeDate.getTime())) {
        const weekday = tradeDate.getDay();
        const stats = weekdayStats.get(weekday) ?? {
          trades: 0,
          wins: 0,
          losses: 0,
          pnl: 0,
        };
        stats.trades += 1;
        stats.pnl += netPnl;
        const outcome = getTradeOutcome(trade);
        if (outcome === 'win') stats.wins += 1;
        if (outcome === 'loss') stats.losses += 1;
        weekdayStats.set(weekday, stats);
      }

      const rawSetup = trade.strategy.trim();
      const setup = isValidTradeSetup(rawSetup) ? rawSetup : rawSetup ? 'Legacy' : '';
      if (setup) {
        const stats = setupStats.get(setup) ?? { trades: 0, wins: 0, losses: 0 };
        stats.trades += 1;
        const outcome = getTradeOutcome(trade);
        if (outcome === 'win') stats.wins += 1;
        if (outcome === 'loss') stats.losses += 1;
        setupStats.set(setup, stats);
      }

    });

    const grossWins = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLosses = Math.abs(
      losingTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    );

    const tradingDays = tradesByDay.size;
    const bestOperatingWindow = getBestOperatingWindow(validTrades);
    const bestSetup = Array.from(setupStats.entries()).reduce<{
      name: string | null;
      trades: number;
      winRate: number;
    }>(
      (best, [name, stats]) => {
        const winRate = calculateWinRate(stats.wins, stats.losses);

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
    const weekdayPerformance = Array.from(weekdayStats.entries()).map(
      ([weekday, stats]) => ({
        name: WEEKDAY_NAMES[weekday],
        trades: stats.trades,
        winRate: calculateWinRate(stats.wins, stats.losses),
        pnl: stats.pnl,
      })
    );
    const bestWeekday = [...weekdayPerformance].sort(
      (a, b) =>
        b.winRate - a.winRate ||
        b.trades - a.trades ||
        b.pnl - a.pnl
    )[0];

    return {
      avgWin: winningTrades.length ? grossWins / winningTrades.length : 0,
      avgLoss: losingTrades.length ? grossLosses / losingTrades.length : 0,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalTrades: validTrades.length,
      longTrades,
      shortTrades,
      tradingDays,
      bestOperatingWindow,
      bestSetup,
      currentStreak: tradeStatistics.currentStreak,
      currentStreakType:
        tradeStatistics.streakType === 'winning'
          ? 'win'
          : tradeStatistics.streakType === 'losing'
            ? 'loss'
            : 'none',
      longestPositiveStreak: tradeStatistics.longestWinStreak,
      riskRewardRatio: calculateRiskRewardRatio(trades),
      maxDrawdown: calculateMaxDrawdown(trades),
      bestWeekday,
    };
  }, [trades]);

  const formatCurrency = (value: number) =>
    `${value.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`;
  const riskRewardPresentation = getRiskRewardCardPresentation(
    data.riskRewardRatio
  );

  return (
    <StatisticsCardGrid
      className={cn(
        'items-start py-3 md:py-4',
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
            {data.totalTrades}{' '}
            {data.totalTrades === 1 ? 'trade eseguito' : 'trade eseguiti'}
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
            Migliore: {data.longestPositiveStreak} win consecutive
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

          <p className="mt-2 break-words font-mono text-xl font-bold tracking-tight text-profit md:mt-3 md:text-2xl">
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
          <RiskRewardCard
            {...riskRewardPresentation}
            surface="analysis"
          />

          <CompactAnalysisCard
            title="Drawdown massimo"
            value={
              data.maxDrawdown === null
                ? '—'
                : streamerMode
                  ? '******'
                  : formatCurrency(data.maxDrawdown)
            }
            subtitle={
              data.maxDrawdown === null
                ? 'Nessun dato disponibile'
                : data.maxDrawdown === 0
                  ? 'Nessun drawdown registrato'
                  : 'Perdita massima'
            }
            tone={data.maxDrawdown !== null && data.maxDrawdown < 0 ? 'loss' : 'neutral'}
            hasData={data.maxDrawdown !== null}
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

    </StatisticsCardGrid>
  );
}

function CompactAnalysisCard({
  title,
  value,
  subtitle,
  tone,
  progress,
  hasData,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: 'profit' | 'loss' | 'neutral';
  progress?: number;
  hasData?: boolean;
}) {
  const indicatorWidth = progress === undefined
    ? hasData
      ? 100
      : 0
    : Math.min(Math.max(progress, 0), 100);

  return (
    <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
      <CardContent className="flex min-h-[104px] min-w-0 flex-col justify-center p-3.5 md:min-h-[124px] md:p-4">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">
          {title}
        </p>
        <p
          className={`mt-2 break-words font-mono text-lg font-bold tracking-tight md:mt-3 md:text-xl ${
            tone === 'profit'
              ? 'text-profit'
              : tone === 'loss'
                ? 'text-loss'
                : hasData === false
                  ? 'text-muted-foreground'
                  : 'text-foreground'
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
              tone === 'profit'
                ? 'bg-profit/80'
                : tone === 'loss'
                  ? 'bg-loss/80'
                  : 'bg-muted-foreground/40'
            }`}
            style={{ width: `${indicatorWidth}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
