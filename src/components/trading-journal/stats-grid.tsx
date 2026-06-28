'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { calculateStatistics } from '@/lib/calculations';
import type { Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

interface StatsGridProps {
  trades: Trade[];
}

export function StatsGrid({ trades }: StatsGridProps) {
  const { streamerMode } = useStreamerMode();
  const stats = useMemo(() => calculateStatistics(trades), [trades]);

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`;
  };

  const formatRatio = (value: number) => {
    if (!isFinite(value) || isNaN(value)) return '—';
    return value.toFixed(2);
  };

  const hasNoTrades = trades.length === 0;

  const profitFactor =
    hasNoTrades || !isFinite(stats.profitFactor) || isNaN(stats.profitFactor)
      ? 0
      : stats.profitFactor;

  const profitFactorPercent = Math.min((profitFactor / 2) * 100, 100);

  const profitFactorColor =
    profitFactor >= 1
      ? 'bg-profit'
      : profitFactor >= 0.5
      ? 'bg-[#ff4d70]/70'
      : 'bg-[#ff4d70]';

  return (
    <div
      className="grid grid-cols-1 gap-3 py-3 md:grid-cols-3 md:gap-4 md:py-4"
      data-tutorial="stats-grid"
    >
      <Card className="rounded-2xl border border-border bg-card/95 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[68px] flex-col justify-between gap-2 p-3 md:min-h-[72px] md:p-3.5">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">
            P&L attuale
          </span>

          <div className="flex min-w-0 flex-wrap items-center gap-2 md:gap-3">
            <span className="min-w-0 break-words font-mono text-lg font-semibold tracking-tight text-profit md:text-xl">
              {streamerMode ? '******' : formatCurrency(stats.totalPnl)}
            </span>

            <div className="shrink-0 rounded-full border border-border bg-background/70 px-2.5 py-1 font-mono text-[11px] font-medium text-white md:px-3">
              {stats.totalTrades} trade
            </div>
          </div>

          <span className="font-mono text-[11px] text-muted-foreground">
            Performance Totale
          </span>
        </CardContent>
      </Card>

     <Card className="rounded-2xl border border-border bg-card/95 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
  <CardContent className="flex min-h-[68px] flex-col justify-between gap-2 p-3 md:min-h-[72px] md:p-3.5">
    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">
      Win rate
    </span>

    <div className="flex min-w-0 items-start gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-lg font-semibold tracking-tight text-foreground md:text-xl">
            {hasNoTrades ? '—' : `${stats.winRate.toFixed(0)}%`}
          </span>

          <div className="rounded-full border border-profit/40 bg-profit/10 px-2 py-1 font-mono text-[11px] font-medium text-profit md:px-2.5">
            {stats.winningTrades} win
          </div>

          <div className="rounded-full border border-loss/40 bg-loss/10 px-2 py-1 font-mono text-[11px] font-medium text-loss md:px-2.5">
            {stats.losingTrades} loss
          </div>
        </div>

        <span className="font-mono text-[11px] text-muted-foreground">
          Percentuale trade vincenti
        </span>
      </div>
    </div>
  </CardContent>
</Card>

      <Card className="rounded-2xl border border-border bg-card/95 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
        <CardContent className="flex min-h-[68px] flex-col justify-between gap-2 p-3 md:min-h-[72px] md:p-3.5">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">
            Profit factor
          </span>

          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="font-mono text-lg font-semibold tracking-tight text-foreground md:text-xl">
              {hasNoTrades ? '—' : formatRatio(stats.profitFactor)}
            </span>

            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary md:w-40 md:flex-none">
              <div
                className={`h-full rounded-full transition-all ${profitFactorColor}`}
                style={{ width: `${profitFactorPercent}%` }}
              />
            </div>
          </div>

          <span className="font-mono text-[11px] text-muted-foreground">
            Rapporto profitti / perdite
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
