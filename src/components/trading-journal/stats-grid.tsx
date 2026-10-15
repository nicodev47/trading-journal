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

function Chip({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'profit' | 'loss';
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium tabular-nums',
        tone === 'neutral' && 'border-border bg-background/70 text-foreground',
        tone === 'profit' && 'border-profit/40 bg-profit/10 text-profit',
        tone === 'loss' && 'border-loss/40 bg-loss/10 text-loss'
      )}
    >
      {children}
    </span>
  );
}

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
        'flex min-w-0 flex-col justify-start gap-3 rounded-2xl border border-border bg-card p-4',
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
        <div className="flex flex-col items-start gap-2">
          <span
            className={cn(
              'font-sans text-xl font-semibold tabular-nums tracking-tight',
              toneClass(hasNoTrades ? null : stats.totalPnl)
            )}
          >
            {hide(formatCurrency(stats.totalPnl))}
          </span>
          <Chip>{trades.length} trade</Chip>
        </div>
      </KpiCard>

      <KpiCard title="Win rate" className="md:col-span-2 xl:col-span-1">
        <div className="flex flex-col items-start gap-2">
          <span className="font-sans text-xl font-semibold tabular-nums tracking-tight text-foreground">
            {hasNoTrades ? '—' : `${stats.winRate.toFixed(0)}%`}
          </span>
          <div className="flex items-center gap-2">
            <Chip tone="profit">{stats.winningTrades} win</Chip>
            <Chip tone="loss">{stats.losingTrades} loss</Chip>
          </div>
        </div>
      </KpiCard>

      <KpiCard title="Aspettativa per trade" className="md:col-span-2 xl:col-span-1">
        <div className="flex flex-col items-start gap-2">
          <span
            className={cn(
              'font-sans text-xl font-semibold tabular-nums tracking-tight',
              toneClass(expectancy)
            )}
          >
            {expectancy === null ? '—' : hide(formatCurrency(expectancy))}
          </span>
          {!hasNoTrades && (
            <div className="flex flex-col gap-0.5 font-sans text-[11px] tabular-nums text-muted-foreground">
              <span>
                Media win <span className="text-profit">{hide(formatCurrency(stats.avgWin))}</span>
              </span>
              <span>
                Media loss{' '}
                <span className="text-loss">{hide(formatCurrency(Math.abs(stats.avgLoss)))}</span>
              </span>
            </div>
          )}
        </div>
      </KpiCard>

      <KpiCard title="Profit factor" className="md:col-span-3 xl:col-span-1">
        <span className="font-sans text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatProfitFactorValue(profitFactor)}
        </span>
      </KpiCard>

      <KpiCard title="Giorni operativi" className="md:col-span-3 xl:col-span-1">
        <div className="flex flex-col items-start gap-2">
          <span className="font-sans text-xl font-semibold tabular-nums tracking-tight text-foreground">
            {stats.tradingDays} {stats.tradingDays === 1 ? 'giorno' : 'giorni'}
          </span>
          <div className="flex items-center gap-2">
            <Chip tone="profit">{stats.greenDays} win</Chip>
            <Chip tone="loss">{stats.redDays} loss</Chip>
          </div>
        </div>
      </KpiCard>
    </div>
  );
}
