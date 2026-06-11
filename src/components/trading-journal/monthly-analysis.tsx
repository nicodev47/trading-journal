'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Trade } from '@/lib/types/trade';

interface MonthlyAnalysisProps {
  trades: Trade[];
}

const MONTHS = [
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
];

function netPnl(trade: Trade) {
  return trade.pnl - trade.commission;
}

function formatCurrency(value: number) {
  return `${value.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function MonthlyAnalysis({ trades }: MonthlyAnalysisProps) {
  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(trades.map((trade) => new Date(trade.exitDate).getFullYear()))
    ).sort((a, b) => b - a);
    return years.length > 0 ? years : [new Date().getFullYear()];
  }, [trades]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0]);

  const months = useMemo(() => {
    return MONTHS.map((monthName, monthIndex) => {
      const monthTrades = trades.filter((trade) => {
        const d = new Date(trade.exitDate);
        return d.getFullYear() === selectedYear && d.getMonth() === monthIndex;
      });

      const totalPnl = monthTrades.reduce((sum, trade) => sum + netPnl(trade), 0);
      const wins = monthTrades.filter((trade) => netPnl(trade) > 0);
      const losses = monthTrades.filter((trade) => netPnl(trade) < 0);
      const grossWins = wins.reduce((sum, trade) => sum + netPnl(trade), 0);
      const grossLosses = Math.abs(losses.reduce((sum, trade) => sum + netPnl(trade), 0));
      const winRate = monthTrades.length > 0 ? (wins.length / monthTrades.length) * 100 : 0;
      const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

      const tradesByDay = new Map<string, number>();
      monthTrades.forEach((trade) => {
        const key = trade.exitDate.split('T')[0];
        tradesByDay.set(key, (tradesByDay.get(key) || 0) + netPnl(trade));
      });
      const dayValues = Array.from(tradesByDay.values());
      const greenDays = dayValues.filter((value) => value > 0).length;
      const dayWinRate = dayValues.length > 0 ? (greenDays / dayValues.length) * 100 : 0;
      const bestDay = dayValues.length ? Math.max(...dayValues) : 0;
      const worstDay = dayValues.length ? Math.min(...dayValues) : 0;

      return {
        monthName,
        monthIndex,
        totalPnl,
        trades: monthTrades.length,
        wins: wins.length,
        losses: losses.length,
        winRate,
        dayWinRate,
        profitFactor,
        bestDay,
        worstDay,
      };
    });
  }, [selectedYear, trades]);

  const yearTotal = months.reduce((sum, month) => sum + month.totalPnl, 0);
  const yearTrades = months.reduce((sum, month) => sum + month.trades, 0);
  const yearWins = months.reduce((sum, month) => sum + month.wins, 0);
  const yearLosses = months.reduce((sum, month) => sum + month.losses, 0);
  const yearWinRate = yearTrades > 0 ? (yearWins / yearTrades) * 100 : 0;
  const grossWins = months.reduce((sum, month) => sum + Math.max(month.totalPnl, 0), 0);
  const grossLosses = Math.abs(months.reduce((sum, month) => sum + Math.min(month.totalPnl, 0), 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;
  const maxAbsPnl = Math.max(...months.map((month) => Math.abs(month.totalPnl)), 1);

  const selectedYearIndex = availableYears.indexOf(selectedYear);
  const goPreviousYear = () => {
    const nextIndex = Math.min(selectedYearIndex + 1, availableYears.length - 1);
    setSelectedYear(availableYears[nextIndex] || selectedYear - 1);
  };
  const goNextYear = () => {
    const nextIndex = Math.max(selectedYearIndex - 1, 0);
    setSelectedYear(availableYears[nextIndex] || selectedYear + 1);
  };

  let cumulative = 0;
  const equityData = months.map((month) => {
    cumulative += month.totalPnl;
    return {
      month: month.monthName.slice(0, 3),
      equity: cumulative,
    };
  });
  const yearIsPositive = equityData.length === 0 || equityData[equityData.length - 1].equity >= 0;
  const equityStrokeColor = yearIsPositive ? '#22c55e' : '#ff4d70';
  const equityFillStart = yearIsPositive ? 'rgba(34, 197, 94, 0.30)' : 'rgba(255, 77, 112, 0.30)';
  const equityFillEnd = yearIsPositive ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255, 77, 112, 0.05)';

  return (
    <section className="pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-mono text-base font-semibold tracking-wide text-foreground">
            Analisi mensile
          </h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Performance complessiva mese per mese.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={goPreviousYear}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-16 rounded-md border border-border bg-card px-3 py-2 text-center font-mono text-xs font-semibold">
            {selectedYear}
          </span>
          <Button variant="outline" size="icon" className="size-8" onClick={goNextYear}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryBox title="P&L annuale" value={formatCurrency(yearTotal)} color={yearTotal > 0 ? 'profit' : yearTotal < 0 ? 'loss' : 'neutral'} />
        <SummaryBox title="Winrate" value={formatPercent(yearWinRate)} subtitle={`${yearWins} win / ${yearLosses} loss`} />
        <SummaryBox title="Trade totali" value={yearTrades.toString()} />
        <SummaryBox title="Profit factor" value={!isFinite(profitFactor) ? '∞' : profitFactor.toFixed(2)} />
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
        <div className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          P&L mensile — {selectedYear}
        </div>
        <div className="w-full overflow-x-auto">
          <div className="flex h-52 min-w-[680px] items-end gap-3 border-b border-border/70 px-2 pb-4 sm:min-w-0">
          {months.map((month) => {
            const height = Math.max((Math.abs(month.totalPnl) / maxAbsPnl) * 150, month.totalPnl !== 0 ? 12 : 2);
            return (
              <div key={month.monthName} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-[160px] w-full items-end justify-center">
                  {month.totalPnl !== 0 && (
                    <div
                      className={cn(
                        'w-8 rounded-t-md',
                        month.totalPnl > 0 ? 'bg-profit' : 'bg-loss'
                      )}
                      style={{ height }}
                      title={`${month.monthName}: ${formatCurrency(month.totalPnl)}`}
                    />
                  )}
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {month.monthName.slice(0, 3)}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[860px]">
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.9fr_0.9fr_1fr_1fr] border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Mese</span>
          <span>P&L netto</span>
          <span>Trade</span>
          <span>Win %</span>
          <span>% giorni positivi</span>
          <span>Profit factor</span>
          <span>Giorno migliore</span>
          <span>Giorno peggiore</span>
        </div>
        {months.map((month) => (
          <div key={month.monthName} className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.9fr_0.9fr_1fr_1fr] border-b border-border/70 px-4 py-3 font-mono text-xs last:border-b-0">
            <span className="text-foreground">{month.monthName}</span>
            <span className={cn(month.totalPnl > 0 && 'text-profit', month.totalPnl < 0 && 'text-loss', month.totalPnl === 0 && 'text-muted-foreground')}>
              {month.trades ? formatCurrency(month.totalPnl) : '—'}
            </span>
            <span>{month.trades || '—'}</span>
            <span>{month.trades ? formatPercent(month.winRate) : '—'}</span>
            <span>{month.trades ? formatPercent(month.dayWinRate) : '—'}</span>
            <span>{month.trades ? (!isFinite(month.profitFactor) ? '∞' : month.profitFactor.toFixed(2)) : '—'}</span>
            <span className={month.bestDay > 0 ? 'text-profit' : 'text-muted-foreground'}>{month.trades ? formatCurrency(month.bestDay) : '—'}</span>
            <span className={month.worstDay < 0 ? 'text-loss' : 'text-muted-foreground'}>{month.trades ? formatCurrency(month.worstDay) : '—'}</span>
          </div>
        ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
        <div className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Equity cumulativa — {selectedYear}
        </div>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="monthlyEquityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={equityFillStart} />
                  <stop offset="95%" stopColor={equityFillEnd} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#e5e5e5' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#e5e5e5' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`$${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Equity']}
                cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={equityStrokeColor}
                strokeWidth={2}
                fill="url(#monthlyEquityGradient)"
                activeDot={{ r: 6, fill: equityStrokeColor, stroke: '#fff', strokeWidth: 2 }}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function SummaryBox({ title, value, subtitle, color = 'default' }: { title: string; value: string; subtitle?: string; color?: 'profit' | 'loss' | 'neutral' | 'default' }) {
  return (
    <div className="rounded-xl border border-border bg-card/95 p-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
      <div
        className={cn(
          'font-mono text-base font-semibold',
          color === 'profit' && 'text-profit',
          color === 'loss' && 'text-loss',
          color === 'neutral' && 'text-muted-foreground'
        )}
      >
        {value}
      </div>
      {subtitle && <div className="mt-1 font-mono text-[11px] text-muted-foreground">{subtitle}</div>}
    </div>
  );
}
