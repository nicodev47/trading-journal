'use client';

import { useMemo } from 'react';
import {
  calculateRiskRewardRatio,
  calculateStatistics,
} from '@/lib/calculations';
import type { Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import {
  getRiskRewardCardPresentation,
  RiskRewardCard,
} from './profit-factor-card';
import { StatisticsCardGrid } from './statistics-card-grid';
import { StatsCard } from './stats-card';

interface StatsGridProps {
  trades: Trade[];
}

export function StatsGrid({ trades }: StatsGridProps) {
  const { streamerMode } = useStreamerMode();
  const stats = useMemo(() => calculateStatistics(trades), [trades]);
  const riskRewardRatio = useMemo(
    () => calculateRiskRewardRatio(trades),
    [trades]
  );

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`;
  };

  const hasNoTrades = stats.totalTrades === 0;
  const pnlValueColor = stats.totalPnl > 0
    ? 'profit'
    : stats.totalPnl < 0
      ? 'loss'
      : 'default';
  const riskRewardPresentation =
    getRiskRewardCardPresentation(riskRewardRatio);

  return (
    <StatisticsCardGrid
      className="py-3 md:py-4"
      data-tutorial="stats-grid"
    >
      <StatsCard
        title="P&L attuale"
        value={
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="whitespace-nowrap">
              {streamerMode ? '******' : formatCurrency(stats.totalPnl)}
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-border bg-background/70 px-3 py-1 font-mono text-[11px] font-medium text-foreground">
              {trades.length} trade
            </span>
          </span>
        }
        subtitle="Performance totale"
        valueColor={pnlValueColor}
      />

      <StatsCard
        title="Win rate"
        value={
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="whitespace-nowrap">
              {hasNoTrades ? '—' : `${stats.winRate.toFixed(0)}%`}
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-profit/40 bg-profit/10 px-3 py-1 font-mono text-[11px] font-medium text-profit">
              {stats.winningTrades} win
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-loss/40 bg-loss/10 px-3 py-1 font-mono text-[11px] font-medium text-loss">
              {stats.losingTrades} loss
            </span>
          </span>
        }
        subtitle="Percentuale trade vincenti"
        valueColor={hasNoTrades ? 'neutral' : 'default'}
      />

      <RiskRewardCard
        {...riskRewardPresentation}
      />
    </StatisticsCardGrid>
  );
}
