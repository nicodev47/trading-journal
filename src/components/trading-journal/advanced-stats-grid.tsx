'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  countOutsideWindowTrades,
  getBestOperatingWindow,
  getWorstOperatingWindow,
} from '@/lib/operating-windows';
import { isValidTradeSetup, type Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { usePreferences } from '@/contexts/preferences-context';
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
const MONTH_NAMES = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
] as const;

function formatSignedCurrency(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

export function AdvancedStatsGrid({
  trades,
  extended = false,
}: AdvancedStatsGridProps) {
  const { streamerMode } = useStreamerMode();
  const { preferences } = usePreferences();
  const data = useMemo(() => {
    const validTrades = trades.filter(isValidStatTrade);
    const winningTrades = validTrades.filter((trade) => getTradeOutcome(trade) === 'win');
    const losingTrades = validTrades.filter((trade) => getTradeOutcome(trade) === 'loss');
    const tradeStatistics = calculateStatistics(trades);
    const longTrades = validTrades.filter((trade) => trade.direction === 'long').length;
    const shortTrades = validTrades.filter((trade) => trade.direction === 'short').length;
    const tradesByDay = new Map<string, number>();
    const setupStats = new Map<
      string,
      { trades: number; wins: number; losses: number; pnl: number }
    >();
    const weekdayStats = new Map<
      number,
      { trades: number; wins: number; losses: number; pnl: number }
    >();
    const monthStats = new Map<
      string,
      { trades: number; wins: number; losses: number; pnl: number }
    >();

    validTrades.forEach((trade) => {
      const date = trade.exitDate.split('T')[0];
      const netPnl = trade.pnl - trade.commission;
      tradesByDay.set(date, (tradesByDay.get(date) ?? 0) + 1);
      const tradeDate = new Date(`${date}T12:00:00`);

      if (!Number.isNaN(tradeDate.getTime())) {
        const weekday = tradeDate.getDay();
        const weekdayData = weekdayStats.get(weekday) ?? {
          trades: 0,
          wins: 0,
          losses: 0,
          pnl: 0,
        };
        const outcome = getTradeOutcome(trade);
        weekdayData.trades += 1;
        weekdayData.pnl += netPnl;
        if (outcome === 'win') weekdayData.wins += 1;
        if (outcome === 'loss') weekdayData.losses += 1;
        weekdayStats.set(weekday, weekdayData);

        const monthKey = date.slice(0, 7);
        const monthData = monthStats.get(monthKey) ?? {
          trades: 0,
          wins: 0,
          losses: 0,
          pnl: 0,
        };
        monthData.trades += 1;
        monthData.pnl += netPnl;
        if (outcome === 'win') monthData.wins += 1;
        if (outcome === 'loss') monthData.losses += 1;
        monthStats.set(monthKey, monthData);
      }

      const rawSetup = trade.strategy.trim();
      const setup = isValidTradeSetup(rawSetup) ? rawSetup : 'Senza Setup';
      const stats = setupStats.get(setup) ?? { trades: 0, wins: 0, losses: 0, pnl: 0 };
      stats.trades += 1;
      stats.pnl += netPnl;
      const outcome = getTradeOutcome(trade);
      if (outcome === 'win') stats.wins += 1;
      if (outcome === 'loss') stats.losses += 1;
      setupStats.set(setup, stats);

    });

    const grossWins = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLosses = Math.abs(
      losingTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    );

    const tradingDays = tradesByDay.size;
    const bestOperatingWindow = getBestOperatingWindow(validTrades, preferences.windows);
    const outsideWindowTrades = countOutsideWindowTrades(validTrades, preferences.windows);
    const worstOperatingWindowCandidate = getWorstOperatingWindow(
      validTrades,
      preferences.windows
    );
    const worstOperatingWindow =
      worstOperatingWindowCandidate &&
      worstOperatingWindowCandidate.name !== bestOperatingWindow?.name
        ? worstOperatingWindowCandidate
        : null;
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
    const worstSetup =
      Array.from(setupStats.entries())
        .filter(([name]) => name !== bestSetup.name && name !== 'Senza Setup')
        .map(([name, stats]) => ({
          name,
          trades: stats.trades,
          winRate: calculateWinRate(stats.wins, stats.losses),
          pnl: stats.pnl,
        }))
        .sort(
          (a, b) =>
            a.winRate - b.winRate ||
            a.pnl - b.pnl ||
            a.trades - b.trades
        )[0] ?? null;
    const bestWeekday = Array.from(weekdayStats.entries())
      .map(([weekday, stats]) => ({
        name: WEEKDAY_NAMES[weekday],
        trades: stats.trades,
        winRate: calculateWinRate(stats.wins, stats.losses),
        pnl: stats.pnl,
      }))
      .sort(
        (a, b) =>
          b.winRate - a.winRate ||
          b.trades - a.trades ||
          b.pnl - a.pnl
      )[0];
    const worstWeekday = Array.from(weekdayStats.entries())
      .map(([weekday, stats]) => ({
        name: WEEKDAY_NAMES[weekday],
        trades: stats.trades,
        winRate: calculateWinRate(stats.wins, stats.losses),
        pnl: stats.pnl,
      }))
      .sort(
        (a, b) =>
          a.winRate - b.winRate ||
          b.trades - a.trades ||
          a.pnl - b.pnl
      )[0];
    const bestMonthEntry = Array.from(monthStats.entries()).sort(
      (a, b) => b[1].pnl - a[1].pnl || b[1].trades - a[1].trades
    )[0];
    const worstMonthEntry = Array.from(monthStats.entries()).sort(
      (a, b) => a[1].pnl - b[1].pnl || b[1].trades - a[1].trades
    )[0];
    const bestMonth = bestMonthEntry
      ? {
          name: (() => {
            const month = Number(bestMonthEntry[0].split('-')[1]);
            return MONTH_NAMES[month - 1];
          })(),
          trades: bestMonthEntry[1].trades,
          winRate: calculateWinRate(
            bestMonthEntry[1].wins,
            bestMonthEntry[1].losses
          ),
          pnl: bestMonthEntry[1].pnl,
        }
      : null;
    const worstMonth = worstMonthEntry
      ? {
          name: (() => {
            const month = Number(worstMonthEntry[0].split('-')[1]);
            return MONTH_NAMES[month - 1];
          })(),
          trades: worstMonthEntry[1].trades,
          winRate: calculateWinRate(
            worstMonthEntry[1].wins,
            worstMonthEntry[1].losses
          ),
          pnl: worstMonthEntry[1].pnl,
        }
      : null;
    const sortedValidTrades = [...validTrades].sort(
      (a, b) =>
        new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
    );
    let currentWinningProfit = 0;
    let currentWinningTrades = 0;
    let maxConsecutiveProfit = 0;
    let maxConsecutiveProfitTrades = 0;

    sortedValidTrades.forEach((trade) => {
      if (getTradeOutcome(trade) === 'win') {
        currentWinningProfit += trade.pnl - trade.commission;
        currentWinningTrades += 1;

        if (currentWinningProfit > maxConsecutiveProfit) {
          maxConsecutiveProfit = currentWinningProfit;
          maxConsecutiveProfitTrades = currentWinningTrades;
        }
      } else {
        currentWinningProfit = 0;
        currentWinningTrades = 0;
      }
    });

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
      outsideWindowTrades,
      bestSetup,
      worstSetup,
      worstOperatingWindow,
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
      worstWeekday,
      bestMonth,
      worstMonth,
      maxConsecutiveProfit,
      maxConsecutiveProfitTrades,
    };
  }, [trades, preferences.windows]);

  const formatCurrency = (value: number) =>
    `${value.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`;
  const riskRewardPresentation = getRiskRewardCardPresentation(
    data.riskRewardRatio
  );

  const giorniCard = (
      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[112px] min-w-0 flex-col justify-center p-3.5 md:min-h-[148px] md:p-4">
          <p className="font-sans tabular-nums text-xs font-medium tracking-normal text-muted-foreground">
            Giorni operativi
          </p>

          <p className="mt-2 font-sans tabular-nums text-xl font-semibold tracking-tight text-foreground md:mt-3 md:text-2xl">
            <span className="text-profit">{data.tradingDays}</span>{' '}
            {data.tradingDays === 1 ? 'giorno' : 'giorni'}
          </p>

          <p className="mt-1 font-sans tabular-nums text-[11px] text-muted-foreground">
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
  );

  const serieCard = (
      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[112px] min-w-0 flex-col justify-center p-3.5 md:min-h-[148px] md:p-4">
          <p className="font-sans tabular-nums text-xs font-medium tracking-normal text-muted-foreground">
            {extended ? 'Serie massima' : 'Serie attuale'}
          </p>

          <p
            className={`mt-2 font-sans tabular-nums text-xl font-semibold tracking-tight md:mt-3 md:text-2xl ${
              !extended && data.currentStreakType === 'loss'
                ? 'text-loss'
                : 'text-profit'
            }`}
          >
            {extended ? data.longestPositiveStreak : data.currentStreak}{' '}
            {extended || data.currentStreakType !== 'loss' ? 'win' : 'loss'}
            {(extended
              ? data.longestPositiveStreak >= 3
              : data.currentStreakType === 'win' && data.currentStreak >= 3) &&
              ' 🔥'}
          </p>

          <p className="mt-1 font-sans tabular-nums text-[11px] text-muted-foreground">
            {extended
              ? 'Massimo annuale di win consecutive'
              : `Migliore: ${data.longestPositiveStreak} win consecutive`}
          </p>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary md:mt-4">
            <div
              className={`h-full rounded-full transition-all ${
                !extended && data.currentStreakType === 'loss'
                  ? 'bg-loss/80'
                  : 'bg-profit/80'
              }`}
              style={{
                width:
                  (extended
                    ? data.longestPositiveStreak
                    : data.currentStreak) > 0
                    ? '100%'
                    : '0%',
              }}
            />
          </div>
        </CardContent>
      </Card>
  );

  const mediaCard = (
      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[112px] min-w-0 flex-col justify-center p-3.5 md:min-h-[148px] md:p-4">
          <p className="font-sans tabular-nums text-xs font-medium tracking-normal text-muted-foreground">
            Media win / Media loss
          </p>

          <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 font-sans tabular-nums font-semibold tracking-tight md:mt-3">
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

          <p className="mt-1 font-sans tabular-nums text-[11px] text-muted-foreground">
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
  );

  const finestraCard = (
      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[112px] min-w-0 flex-col justify-center p-3.5 md:min-h-[148px] md:p-4">
          <p className="font-sans tabular-nums text-xs font-medium tracking-normal text-muted-foreground">
            Finestra operativa migliore
          </p>

          <p className="mt-2 break-words font-sans tabular-nums text-xl font-semibold tracking-tight text-profit md:mt-3 md:text-2xl">
            {data.bestOperatingWindow?.name ?? '—'}
          </p>

          <p className="mt-1 font-sans tabular-nums text-[11px] text-muted-foreground">
            {data.bestOperatingWindow
              ? `${data.bestOperatingWindow.description}${
                  data.outsideWindowTrades > 0
                    ? ` · ${data.outsideWindowTrades} fuori finestra`
                    : ''
                }`
              : 'Nessun trade registrato'}
          </p>

          <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-secondary md:mt-4">
            {data.bestOperatingWindow && (
              <div className="h-full w-full rounded-full bg-profit/80" />
            )}
          </div>
        </CardContent>
      </Card>
  );

  const setupCard = (
      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[112px] min-w-0 flex-col justify-center p-3.5 md:min-h-[148px] md:p-4">
          <p className="font-sans tabular-nums text-xs font-medium tracking-normal text-muted-foreground">
            Setup migliore
          </p>

          <p className="mt-2 break-words font-sans tabular-nums text-xl font-semibold tracking-tight text-profit md:mt-3 md:text-2xl">
            {data.bestSetup.name ?? '—'}
          </p>

          <p className="mt-1 font-sans tabular-nums text-[11px] text-muted-foreground">
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
  );

  const longshortCard = (
      <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[112px] min-w-0 flex-col justify-center p-3.5 md:min-h-[148px] md:p-4">
          <p className="font-sans tabular-nums text-xs font-medium tracking-normal text-muted-foreground">
            Long vs Short
          </p>

          <div className="mt-2 flex flex-wrap items-baseline gap-2 font-sans tabular-nums font-semibold tracking-tight md:mt-3">
            <span className="text-xl text-profit md:text-2xl">{data.longTrades} long</span>
            <span className="text-xl text-foreground md:text-2xl">/</span>
            <span className="text-xl text-loss md:text-2xl">{data.shortTrades} short</span>
          </div>

          <p className="mt-1 font-sans tabular-nums text-[11px] text-muted-foreground">
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
  );

  if (!extended) {
    return (
      <StatisticsCardGrid
      className={cn(
        'items-start py-3 md:py-4',
        extended &&
          '[&_[data-slot=card-content]]:!min-h-[124px] md:[&_[data-slot=card-content]]:!min-h-[144px]'
      )}
      >
        {giorniCard}
        {serieCard}
        {mediaCard}
        {finestraCard}
        {setupCard}
        {longshortCard}
      </StatisticsCardGrid>
    );
  }

  return (
    <StatisticsCardGrid
      className={cn(
        'items-start py-3 md:py-4',
        extended &&
          '[&_[data-slot=card-content]]:!min-h-[124px] md:[&_[data-slot=card-content]]:!min-h-[144px]'
      )}
    >
          <CompactAnalysisCard
            title="Setup migliore"
            value={data.bestSetup.name ?? '—'}
            subtitle={
              data.bestSetup.name
                ? `${data.bestSetup.winRate.toFixed(0)}% win rate · ${
                    data.bestSetup.trades
                  } trade`
                : 'Nessun setup registrato'
            }
            tone={data.bestSetup.name ? 'profit' : 'neutral'}
            progress={data.bestSetup.name ? data.bestSetup.winRate : 0}
            hasData={data.bestSetup.name !== null}
            prominentValue
          />

          <CompactAnalysisCard
            title="Setup peggiore"
            value={data.worstSetup?.name ?? '—'}
            subtitle={
              data.worstSetup
                ? `${data.worstSetup.winRate.toFixed(0)}% win rate · ${
                    data.worstSetup.trades
                  } trade`
                : 'Servono almeno due setup registrati'
            }
            tone={
              data.worstSetup
                ? data.worstSetup.winRate >= 50
                  ? 'profit'
                  : 'loss'
                : 'neutral'
            }
            progress={data.worstSetup ? data.worstSetup.winRate : 0}
            hasData={data.worstSetup !== null}
            prominentValue
          />

      {giorniCard}

          <CompactAnalysisCard
            title="Finestra operativa migliore"
            value={data.bestOperatingWindow?.name ?? '—'}
            subtitle={
              data.bestOperatingWindow
                ? `${data.bestOperatingWindow.description} · ${data.bestOperatingWindow.tradeCount} trade`
                : 'Nessun trade registrato'
            }
            tone={data.bestOperatingWindow ? 'profit' : 'neutral'}
            hasData={data.bestOperatingWindow !== null}
            prominentValue
          />

          <CompactAnalysisCard
            title="Finestra operativa peggiore"
            value={data.worstOperatingWindow?.name ?? '—'}
            subtitle={
              data.worstOperatingWindow
                ? `${data.worstOperatingWindow.description} · ${data.worstOperatingWindow.tradeCount} trade`
                : 'Servono almeno due finestre con trade'
            }
            tone={
              data.worstOperatingWindow
                ? data.worstOperatingWindow.pnl > 0
                  ? 'profit'
                  : 'loss'
                : 'neutral'
            }
            hasData={data.worstOperatingWindow !== null}
            prominentValue
          />

      {serieCard}

          <CompactAnalysisCard
            title="Giorno operativo migliore"
            value={data.bestWeekday?.name ?? '—'}
            subtitle={
              data.bestWeekday
                ? `${data.bestWeekday.winRate.toFixed(0)}% WR · ${
                    data.bestWeekday.trades
                  } trade · ${
                    streamerMode
                      ? '******'
                      : formatSignedCurrency(data.bestWeekday.pnl)
                  }`
                : 'Nessun trade registrato'
            }
            tone={
              !data.bestWeekday
                ? 'neutral'
                : data.bestWeekday.pnl < 0
                  ? 'loss'
                  : 'profit'
            }
            progress={data.bestWeekday?.winRate ?? 0}
            hasData={Boolean(data.bestWeekday)}
            prominentValue
          />

          <CompactAnalysisCard
            title="Giorno operativo peggiore"
            value={data.worstWeekday?.name ?? '—'}
            subtitle={
              data.worstWeekday
                ? `${data.worstWeekday.winRate.toFixed(0)}% WR · ${
                    data.worstWeekday.trades
                  } trade · ${
                    streamerMode
                      ? '******'
                      : formatSignedCurrency(data.worstWeekday.pnl)
                  }`
                : 'Nessun trade registrato'
            }
            tone={
              !data.worstWeekday
                ? 'neutral'
                : data.worstWeekday.pnl < 0
                  ? 'loss'
                  : 'profit'
            }
            progress={
              data.worstWeekday ? 100 : 0
            }
            hasData={Boolean(data.worstWeekday)}
            prominentValue
          />

      {mediaCard}

          <CompactAnalysisCard
            title="Mese migliore"
            value={data.bestMonth?.name ?? '—'}
            subtitle={
              data.bestMonth
                ? `${data.bestMonth.winRate.toFixed(0)}% WR · ${
                    data.bestMonth.trades
                  } trade · ${
                    streamerMode ? '******' : formatCurrency(data.bestMonth.pnl)
                  }`
                : 'Nessun mese disponibile'
            }
            tone={
              data.bestMonth
                ? data.bestMonth.pnl >= 0
                  ? 'profit'
                  : 'loss'
                : 'neutral'
            }
            hasData={data.bestMonth !== null}
            prominentValue
          />

          <CompactAnalysisCard
            title="Mese peggiore"
            value={data.worstMonth?.name ?? '—'}
            subtitle={
              data.worstMonth
                ? `${data.worstMonth.winRate.toFixed(0)}% WR · ${
                    data.worstMonth.trades
                  } trade · ${
                    streamerMode ? '******' : formatCurrency(data.worstMonth.pnl)
                  }`
                : 'Nessun mese disponibile'
            }
            tone={
              data.worstMonth
                ? data.worstMonth.pnl < 0
                  ? 'loss'
                  : 'profit'
                : 'neutral'
            }
            hasData={data.worstMonth !== null}
            prominentValue
          />

      {longshortCard}

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
            title="Profitto massimo realizzato di fila"
            value={
              data.maxConsecutiveProfitTrades === 0
                ? '—'
                : streamerMode
                  ? '******'
                  : formatCurrency(data.maxConsecutiveProfit)
            }
            subtitle={
              data.maxConsecutiveProfitTrades > 0
                ? `${data.maxConsecutiveProfitTrades} win consecutive`
                : 'Nessuna serie positiva'
            }
            tone={data.maxConsecutiveProfitTrades > 0 ? 'profit' : 'neutral'}
            hasData={data.maxConsecutiveProfitTrades > 0}
          />

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
  prominentValue = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: 'profit' | 'loss' | 'neutral';
  progress?: number;
  hasData?: boolean;
  prominentValue?: boolean;
}) {
  const indicatorWidth = progress === undefined
    ? hasData
      ? 100
      : 0
    : Math.min(Math.max(progress, 0), 100);

  return (
    <Card className="self-start rounded-2xl border border-border bg-card/95 py-0 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
      <CardContent className="flex min-h-[104px] min-w-0 flex-col justify-center p-3.5 md:min-h-[124px] md:p-4">
        <p className="font-sans tabular-nums text-xs font-medium tracking-normal text-muted-foreground">
          {title}
        </p>
        <p
          className={`mt-2 break-words font-sans tabular-nums font-semibold tracking-tight md:mt-3 ${
            prominentValue ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'
          } ${
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
        <p className="mt-1 font-sans tabular-nums text-[11px] text-muted-foreground">
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
