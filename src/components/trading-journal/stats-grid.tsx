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
import { toArcSegments, toShares } from '@/lib/kpi-charts';
import { Wallet } from 'lucide-react';

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
        'whitespace-nowrap rounded-full border px-2 py-0.5 font-sans text-[11px] font-medium tabular-nums',
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

const RING_RADIUS = 22;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const GAUGE_RADIUS = 36;
const GAUGE_LENGTH = Math.PI * GAUGE_RADIUS;

type Part = { value: number; className: string };

/** Ring split into consecutive coloured arcs (profit factor, operating days). */
function Ring({ parts }: { parts: Part[] }) {
  const segments = toArcSegments(
    parts.map(part => part.value),
    RING_LENGTH
  );
  const empty = segments.every(segment => segment.dash === 0);

  return (
    <svg viewBox="0 0 60 60" className="size-12 shrink-0 -rotate-90" aria-hidden="true">
      <circle
        cx="30"
        cy="30"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="7"
        className="stroke-secondary"
      />
      {!empty &&
        segments.map((segment, index) => (
          <circle
            key={index}
            cx="30"
            cy="30"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="7"
            strokeDasharray={`${segment.dash} ${segment.gap}`}
            strokeDashoffset={segment.offset}
            className={parts[index].className}
          />
        ))}
    </svg>
  );
}

/** Half-circle gauge with win / break-even / loss counts below the arc ends. */
function Gauge({ win, breakEven, loss }: { win: number; breakEven: number; loss: number }) {
  const parts: Part[] = [
    { value: win, className: 'stroke-profit' },
    { value: breakEven, className: 'stroke-[#0a84ff]' },
    { value: loss, className: 'stroke-loss' },
  ];
  const segments = toArcSegments(
    parts.map(part => part.value),
    GAUGE_LENGTH
  );
  const empty = segments.every(segment => segment.dash === 0);
  const path = `M 6 46 A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 78 46`;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <svg viewBox="0 0 84 52" className="h-11 w-[84px]" aria-hidden="true">
        <path d={path} fill="none" strokeWidth="7" strokeLinecap="butt" className="stroke-secondary" />
        {!empty &&
          segments.map((segment, index) => (
            <path
              key={index}
              d={path}
              fill="none"
              strokeWidth="7"
              strokeDasharray={`${segment.dash} ${segment.gap}`}
              strokeDashoffset={segment.offset}
              className={parts[index].className}
            />
          ))}
      </svg>
      <div className="flex w-[92px] items-center justify-between font-sans text-[10px] font-medium tabular-nums">
        <span className="rounded-full bg-profit/15 px-1.5 text-profit">{win}</span>
        <span className="rounded-full bg-[#0a84ff]/15 px-1.5 text-[#5cb8ff]">{breakEven}</span>
        <span className="rounded-full bg-loss/15 px-1.5 text-loss">{loss}</span>
      </div>
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

  const lossAbs = Math.abs(stats.avgLoss);
  const [avgWinShare] = toShares([stats.avgWin, lossAbs]);

  return (
    <div
      className="grid grid-cols-2 gap-3 py-3 md:grid-cols-4 md:gap-4 md:py-4 [&>*]:min-w-0"
      data-tutorial="stats-grid"
    >
      <KpiCard title="P&L netto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col items-start gap-2">
            <span
              className={cn(
                'whitespace-nowrap font-sans text-xl font-semibold tabular-nums tracking-tight',
                toneClass(hasNoTrades ? null : stats.totalPnl)
              )}
            >
              {hide(formatCurrency(stats.totalPnl))}
            </span>
            <Chip>{trades.length} trade</Chip>
          </div>
          <div className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground 2xl:flex">
            <Wallet className="size-4" />
          </div>
        </div>
      </KpiCard>

      <KpiCard title="Win rate">
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-xl font-semibold tabular-nums tracking-tight text-foreground">
            {hasNoTrades ? '—' : `${stats.winRate.toFixed(0)}%`}
          </span>
          <Gauge
            win={stats.winningTrades}
            breakEven={stats.breakEvenTrades}
            loss={stats.losingTrades}
          />
        </div>
      </KpiCard>

      <KpiCard title="Aspettativa per trade">
        <div className="flex flex-col gap-3">
          <span
            className={cn(
              'font-sans text-xl font-semibold tabular-nums tracking-tight',
              toneClass(expectancy)
            )}
          >
            {expectancy === null ? '—' : hide(formatCurrency(expectancy))}
          </span>
          {!hasNoTrades && (
            <div className="flex flex-col gap-1">
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                {stats.avgWin + lossAbs > 0 && (
                  <>
                    <div className="h-full bg-profit/80" style={{ width: `${avgWinShare * 100}%` }} />
                    <div className="h-full bg-loss/80" style={{ width: `${(1 - avgWinShare) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex justify-between font-sans text-[11px] tabular-nums">
                <span className="text-profit">{hide(formatCurrency(stats.avgWin))}</span>
                <span className="text-loss">{hide(formatCurrency(lossAbs))}</span>
              </div>
            </div>
          )}
        </div>
      </KpiCard>

      <KpiCard title="Profit factor">
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatProfitFactorValue(profitFactor)}
          </span>
          <Ring
            parts={[
              { value: profitFactor.grossProfit, className: 'stroke-profit' },
              { value: profitFactor.grossLoss, className: 'stroke-loss' },
            ]}
          />
        </div>
      </KpiCard>
    </div>
  );
}
