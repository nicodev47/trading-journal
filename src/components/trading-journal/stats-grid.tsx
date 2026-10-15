'use client';

import { useMemo } from 'react';
import {
  calculateExpectancy,
  calculateProfitFactorDetails,
  calculateStatistics,
  formatProfitFactorValue,
} from '@/lib/calculations';
import type { Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { cn } from '@/lib/utils';

interface StatsGridProps {
  trades: Trade[];
}

const formatCurrency = (value: number) =>
  `${value.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;

const toneClass = (value: number | null) =>
  value === null || value === 0
    ? 'text-foreground'
    : value > 0
      ? 'text-profit'
      : 'text-loss';

function KpiCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4',
        className
      )}
    >
      <span className="font-sans text-xs font-medium text-muted-foreground">{title}</span>
      {children}
    </div>
  );
}

export function StatsGrid({ trades }: StatsGridProps) {
  const { streamerMode } = useStreamerMode();
  const stats = useMemo(() => calculateStatistics(trades), [trades]);
  const profitFactor = useMemo(() => calculateProfitFactorDetails(trades), [trades]);
  const expectancy = useMemo(() => calculateExpectancy(trades), [trades]);

  const hasNoTrades = stats.totalTrades === 0;
  const decided = stats.winningTrades + stats.losingTrades;
  const winShare = decided > 0 ? (stats.winningTrades / decided) * 100 : 0;
  const hide = (text: string) => (streamerMode ? '******' : text);

  return (
    <div
      className="grid grid-cols-2 gap-3 py-3 md:grid-cols-6 md:gap-4 md:py-4 xl:grid-cols-5 [&>*]:min-w-0"
      data-tutorial="stats-grid"
    >
      <KpiCard title="P&L netto" className="col-span-2 md:col-span-2 xl:col-span-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'font-sans text-xl font-semibold tabular-nums tracking-tight',
              toneClass(hasNoTrades ? null : stats.totalPnl)
            )}
          >
            {hide(formatCurrency(stats.totalPnl))}
          </span>
          <span className="rounded-full border border-border bg-background/70 px-2.5 py-0.5 font-sans text-[11px] font-medium tabular-nums text-foreground">
            {trades.length} trade
          </span>
        </div>
      </KpiCard>

      <KpiCard title="Aspettativa per trade" className="md:col-span-2 xl:col-span-1">
        <span
          className={cn(
            'font-sans text-xl font-semibold tabular-nums tracking-tight',
            toneClass(expectancy)
          )}
        >
          {expectancy === null ? '—' : hide(formatCurrency(expectancy))}
        </span>
      </KpiCard>

      <KpiCard title="Profit factor" className="md:col-span-2 xl:col-span-1">
        <span className="font-sans text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatProfitFactorValue(profitFactor)}
        </span>
      </KpiCard>

      <KpiCard title="Win rate" className="md:col-span-3 xl:col-span-1">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-xl font-semibold tabular-nums tracking-tight text-foreground">
              {hasNoTrades ? '—' : `${stats.winRate.toFixed(0)}%`}
            </span>
            <span className="rounded-full border border-profit/40 bg-profit/10 px-2 py-0.5 font-sans text-[11px] tabular-nums text-profit">
              {stats.winningTrades}
            </span>
            <span className="rounded-full border border-loss/40 bg-loss/10 px-2 py-0.5 font-sans text-[11px] tabular-nums text-loss">
              {stats.losingTrades}
            </span>
          </div>
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            {decided > 0 && (
              <>
                <div className="h-full bg-profit/80" style={{ width: `${winShare}%` }} />
                <div className="h-full bg-loss/80" style={{ width: `${100 - winShare}%` }} />
              </>
            )}
          </div>
        </div>
      </KpiCard>

      <KpiCard title="Media win / media loss" className="md:col-span-3 xl:col-span-1">
        <div className="flex flex-col gap-1">
          <span className="font-sans text-xl font-semibold tabular-nums tracking-tight text-foreground">
            {hasNoTrades || stats.avgLoss === 0
              ? '—'
              : stats.avgWinLossRatio.toLocaleString('it-IT', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
          </span>
          {!hasNoTrades && (
            <span className="font-sans text-[11px] tabular-nums text-muted-foreground">
              <span className="text-profit">{hide(formatCurrency(stats.avgWin))}</span>
              {' / '}
              <span className="text-loss">{hide(formatCurrency(Math.abs(stats.avgLoss)))}</span>
            </span>
          )}
        </div>
      </KpiCard>
    </div>
  );
}
