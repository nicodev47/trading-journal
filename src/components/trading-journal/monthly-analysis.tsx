'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EquityCurve } from '@/components/trading-journal/equity-curve';
import { AdvancedStatsGrid } from '@/components/trading-journal/advanced-stats-grid';
import { AnalysisDiagnostics } from '@/components/trading-journal/analysis-diagnostics';
import { ExecutionMap } from '@/components/trading-journal/execution-map';
import { TradeDetailDialog } from '@/components/trading-journal/trade-detail-dialog';
import { TradeGroupDetailDialog } from '@/components/trading-journal/trade-group-detail-dialog';
import { cn } from '@/lib/utils';
import {
  CUSTOM_TAG_PREFIX,
  TRADE_TAGS,
  type Trade,
} from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

interface MonthlyAnalysisProps {
  trades: Trade[];
}

type TagAnalytics = {
  value: string;
  label: string;
  tradeCount: number;
  totalPnl: number;
  winRate: number;
  percent: number;
  trades: Trade[];
};

type TradeGroupDialogState = {
  title: string;
  subtitle?: string;
  trades: Trade[];
};

type SummaryPill = {
  label: string;
  tone?: 'default' | 'profit' | 'loss';
};

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

export function MonthlyAnalysis({
  trades,
}: MonthlyAnalysisProps) {
  const { streamerMode } = useStreamerMode();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [tradeGroupDialog, setTradeGroupDialog] =
    useState<TradeGroupDialogState | null>(null);
  const [isTradeGroupOpen, setIsTradeGroupOpen] = useState(false);
  const [returnToTradeGroup, setReturnToTradeGroup] = useState(false);
  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(trades.map((trade) => new Date(trade.exitDate).getFullYear()))
    ).sort((a, b) => b - a);
    return years.length > 0 ? years : [new Date().getFullYear()];
  }, [trades]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0]);

  const yearFilteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const tradeDate = new Date(trade.exitDate);
      return tradeDate.getFullYear() === selectedYear;
    });
  }, [selectedYear, trades]);

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
        monthTrades,
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
  const yearLongTrades = yearFilteredTrades.filter((trade) => trade.direction === 'long').length;
  const yearShortTrades = yearFilteredTrades.filter((trade) => trade.direction === 'short').length;
  const grossWins = months.reduce((sum, month) => sum + Math.max(month.totalPnl, 0), 0);
  const grossLosses = Math.abs(months.reduce((sum, month) => sum + Math.min(month.totalPnl, 0), 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;
  const maxAbsPnl = Math.max(...months.map((month) => Math.abs(month.totalPnl)), 1);
  const maxMonthlyTrades = Math.max(...months.map((month) => month.trades), 1);

  const selectedYearIndex = availableYears.indexOf(selectedYear);
  const goPreviousYear = () => {
    const nextIndex = Math.min(selectedYearIndex + 1, availableYears.length - 1);
    setSelectedYear(availableYears[nextIndex] || selectedYear - 1);
  };
  const goNextYear = () => {
    const nextIndex = Math.max(selectedYearIndex - 1, 0);
    setSelectedYear(availableYears[nextIndex] || selectedYear + 1);
  };

  const tagAnalytics = useMemo<TagAnalytics[]>(() => {
    const tagMap = new Map<string, { trades: Trade[]; totalPnl: number; wins: number }>();

    yearFilteredTrades.forEach((trade) => {
      const uniqueTags = Array.from(new Set(trade.tags ?? []));

      uniqueTags.forEach((tag) => {
        const current = tagMap.get(tag) || { trades: [], totalPnl: 0, wins: 0 };
        const pnl = netPnl(trade);

        current.trades.push(trade);
        current.totalPnl += pnl;
        current.wins += pnl > 0 ? 1 : 0;
        tagMap.set(tag, current);
      });
    });

    return Array.from(tagMap.entries())
      .map(([value, stats]) => {
        const standardTag = TRADE_TAGS.find((tag) => tag.value === value);
        const label = standardTag
          ? `${standardTag.emoji} ${standardTag.label}`
          : value.startsWith(CUSTOM_TAG_PREFIX)
            ? value.slice(CUSTOM_TAG_PREFIX.length)
            : value;

        return {
          value,
          label,
          trades: stats.trades,
          tradeCount: stats.trades.length,
          totalPnl: stats.totalPnl,
          winRate:
            stats.trades.length > 0
              ? (stats.wins / stats.trades.length) * 100
              : 0,
          percent:
            yearFilteredTrades.length > 0
              ? (stats.trades.length / yearFilteredTrades.length) * 100
              : 0,
        };
      })
      .sort((a, b) => b.tradeCount - a.tradeCount)
      .slice(0, 6);
  }, [yearFilteredTrades]);

  const openTradeGroup = (
    title: string,
    subtitle: string,
    groupTrades: Trade[]
  ) => {
    if (groupTrades.length === 0) {
      return;
    }

    setTradeGroupDialog({
      title,
      subtitle,
      trades: groupTrades,
    });
    setIsTradeGroupOpen(true);
    setReturnToTradeGroup(false);
  };

  const openMonthTradeGroup = (
    month: (typeof months)[number],
    titlePrefix: string,
    subtitle: string
  ) => {
    openTradeGroup(
      `${titlePrefix} ${month.monthName} ${selectedYear}`,
      subtitle,
      month.monthTrades
    );
  };

  return (
    <section className="pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-mono text-base font-semibold tracking-wide text-foreground">
            Analisi annuale
          </h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Analisi annuale delle performance operative e dei pattern del journal.
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
        <SummaryBox
          title="P&L annuale"
          value={streamerMode ? '******' : formatCurrency(yearTotal)}
          color={yearTotal > 0 ? 'profit' : yearTotal < 0 ? 'loss' : 'neutral'}
          description="Performance netta del periodo"
          pills={[{ label: `${yearTrades} trade` }]}
        />
        <SummaryBox
          title="Win Rate"
          value={formatPercent(yearWinRate)}
          description="Percentuale trade vincenti"
          pills={[
            { label: `${yearWins} win`, tone: 'profit' },
            { label: `${yearLosses} loss`, tone: 'loss' },
          ]}
          progress={yearWinRate}
        />
        <SummaryBox
          title="Trade totali"
          value={yearTrades.toString()}
          description="Operazioni registrate nel periodo"
          pills={[
            { label: `${yearLongTrades} long`, tone: 'profit' },
            { label: `${yearShortTrades} short`, tone: 'loss' },
          ]}
        />
        <SummaryBox
          title="Profit factor"
          value={!isFinite(profitFactor) ? '∞' : profitFactor.toFixed(2)}
          description="Rapporto profitti / perdite"
          progress={
            Number.isFinite(profitFactor)
              ? Math.min((profitFactor / 4.8) * 100, 100)
              : 0
          }
        />
      </div>

      <div className="mb-4">
        <EquityCurve
          key={selectedYear}
          trades={yearFilteredTrades}
          onOpenTradeGroup={(payload) =>
            openTradeGroup(
              payload.title,
              payload.subtitle ?? 'Operazioni incluse nella curva equity.',
              payload.trades
            )
          }
        />
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
        <div className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          P&L mensile
        </div>
        <div className="ej-scrollbar w-full overflow-x-auto">
          <div className="flex h-60 min-w-[760px] items-end gap-2 border-b border-border/70 px-2 pb-4 sm:min-w-0">
            {months.map((month) => {
              const height = Math.max(
                (Math.abs(month.totalPnl) / maxAbsPnl) * 172,
                month.totalPnl !== 0 ? 14 : 2
              );

              return (
                <div
                  key={month.monthName}
                  className={cn(
                    'flex min-w-0 flex-1 flex-col items-center gap-2',
                    month.trades > 0 && 'cursor-pointer'
                  )}
                  onClick={() =>
                    openMonthTradeGroup(
                      month,
                      'Trade di',
                      'P&L mensile e operazioni del periodo selezionato.'
                    )
                  }
                >
                  <div className="group relative flex h-[180px] w-full items-end justify-center">
                    {month.totalPnl !== 0 && (
                      <>
                        <div
                          className={cn(
                            'pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-xl border border-teal-300/20 bg-[#20242d]/98 px-2.5 py-1.5 font-mono text-[10px] text-slate-200 opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_18px_rgba(45,212,191,0.08)] transition-all duration-200 group-hover:translate-y-1 group-hover:opacity-100',
                            month.monthIndex === 0
                              ? 'left-0'
                              : month.monthIndex === 11
                                ? 'right-0'
                                : 'left-1/2 -translate-x-1/2'
                          )}
                        >
                          <span className="mr-1 text-foreground">
                            {month.monthName}:
                          </span>
                          <span
                            className={cn(
                              'font-semibold',
                              month.totalPnl > 0 && 'text-teal-200',
                              month.totalPnl < 0 && 'text-rose-200'
                            )}
                          >
                            {streamerMode
                              ? '******'
                              : formatCurrency(month.totalPnl)}
                          </span>
                        </div>
                        <div
                          className={cn(
                            'w-11 rounded-t-lg transition-all duration-200 group-hover:scale-x-105 group-hover:brightness-110 sm:w-12',
                            month.totalPnl > 0 &&
                              'bg-[linear-gradient(to_top,rgba(0,214,143,0.25),#00d68f)] shadow-[0_0_12px_rgba(0,214,143,0.18)] group-hover:shadow-[0_0_22px_rgba(0,214,143,0.34)]',
                            month.totalPnl < 0 &&
                              'bg-[linear-gradient(to_top,rgba(255,77,112,0.25),#ff4d70)] shadow-[0_0_12px_rgba(255,77,112,0.16)] group-hover:shadow-[0_0_22px_rgba(255,77,112,0.32)]'
                          )}
                          style={{ height }}
                        />
                      </>
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

      <div className="mb-4 rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
        <div className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Distribuzione operazioni
        </div>

        {yearTrades === 0 ? (
          <div className="flex h-52 items-center justify-center rounded-xl border border-border/70 bg-background/30">
            <p className="font-mono text-xs text-muted-foreground">
              Nessuna operazione inserita.
            </p>
          </div>
        ) : (
          <div className="ej-scrollbar w-full overflow-x-auto">
            <div className="flex min-w-[760px] gap-3 sm:min-w-0">
              <div className="flex h-60 w-7 shrink-0 flex-col justify-between pb-7 pt-1 text-right font-mono text-[9px] text-muted-foreground">
                <span>{maxMonthlyTrades}</span>
                <span>{Math.round(maxMonthlyTrades / 2)}</span>
                <span>0</span>
              </div>

              <div className="flex h-60 flex-1 items-end gap-2 border-b border-border/70 px-2 pb-4">
                {months.map((month) => {
                  const height =
                    month.trades > 0
                      ? Math.max((month.trades / maxMonthlyTrades) * 172, 14)
                      : 0;

                  return (
                    <div
                      key={month.monthName}
                      className={cn(
                        'flex min-w-0 flex-1 flex-col items-center gap-2',
                        month.trades > 0 && 'cursor-pointer'
                      )}
                      onClick={() =>
                        openMonthTradeGroup(
                          month,
                          'Operazioni di',
                          'Tutti i trade eseguiti nel mese selezionato.'
                        )
                      }
                    >
                      <div className="group relative flex h-[180px] w-full items-end justify-center">
                        {month.trades > 0 && (
                          <>
                            <div
                              className={cn(
                                'pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-xl border border-teal-300/20 bg-[#20242d]/98 px-2.5 py-1.5 font-mono text-[10px] text-slate-200 opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_18px_rgba(45,212,191,0.08)] transition-all duration-200 group-hover:translate-y-1 group-hover:opacity-100',
                                month.monthIndex === 0
                                  ? 'left-0'
                                  : month.monthIndex === 11
                                    ? 'right-0'
                                    : 'left-1/2 -translate-x-1/2'
                              )}
                            >
                              <span className="mr-1 text-foreground">
                                {month.monthName}:
                              </span>
                              <span className="font-semibold text-teal-200">
                                {month.trades} trade
                              </span>
                            </div>
                            <div
                              className="w-11 rounded-t-lg bg-[linear-gradient(to_top,rgba(0,214,143,0.25),#00d68f)] shadow-[0_0_12px_rgba(0,214,143,0.16)] transition-all duration-200 group-hover:scale-x-105 group-hover:brightness-110 group-hover:shadow-[0_0_22px_rgba(0,214,143,0.32)] sm:w-12"
                              style={{ height }}
                            />
                          </>
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
        )}
      </div>

      <div className="mb-4">
        <ExecutionMap
          trades={trades}
        />
      </div>

      <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
        <div className="ej-scrollbar w-full overflow-x-auto">
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
              {month.trades
                ? streamerMode
                  ? '******'
                  : formatCurrency(month.totalPnl)
                : '—'}
            </span>
            <span>{month.trades || '—'}</span>
            <span>{month.trades ? formatPercent(month.winRate) : '—'}</span>
            <span>{month.trades ? formatPercent(month.dayWinRate) : '—'}</span>
            <span>{month.trades ? (!isFinite(month.profitFactor) ? '∞' : month.profitFactor.toFixed(2)) : '—'}</span>
            <span className={month.bestDay > 0 ? 'text-profit' : 'text-muted-foreground'}>{month.trades ? streamerMode ? '******' : formatCurrency(month.bestDay) : '—'}</span>
            <span className={month.worstDay < 0 ? 'text-loss' : 'text-muted-foreground'}>{month.trades ? streamerMode ? '******' : formatCurrency(month.worstDay) : '—'}</span>
          </div>
        ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <AnalysisDiagnostics trades={yearFilteredTrades} />
      </div>

      <div className="mb-4">
        <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
          <div className="mb-4">
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              TAG ANALYTICS
            </div>
          </div>

          <div className="space-y-3">
            {tagAnalytics.length > 0 ? (
              tagAnalytics.map((tag) => (
                <div
                  key={tag.value}
                  className="space-y-2 rounded-xl p-2 transition-colors hover:bg-secondary/10"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-3 font-mono text-xs">
                    <span className="truncate text-foreground">{tag.label}</span>
                    <span className="text-muted-foreground">
                      {tag.tradeCount} trade
                    </span>
                    <span
                      className={cn(
                        tag.totalPnl > 0 && 'text-profit',
                        tag.totalPnl < 0 && 'text-loss',
                        tag.totalPnl === 0 && 'text-muted-foreground'
                      )}
                    >
                      {streamerMode ? '******' : formatCurrency(tag.totalPnl)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatPercent(tag.winRate)} WR
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg border-border bg-background/50 px-3 font-mono text-xs text-muted-foreground hover:border-profit/50 hover:bg-secondary hover:text-foreground"
                      onClick={() =>
                        openTradeGroup(
                          `Tag: ${tag.label}`,
                          'Tutti i trade associati a questo tag.',
                          tag.trades
                        )
                      }
                    >
                      Apri
                    </Button>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-700 to-profit transition-all duration-200 hover:brightness-110 hover:drop-shadow-[0_0_6px_rgba(45,212,191,0.45)]"
                      style={{ width: `${tag.percent}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-background/50 p-4 font-mono text-xs text-muted-foreground">
                Nessun tag registrato per questo anno.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <AdvancedStatsGrid trades={yearFilteredTrades} extended />
      </div>

      <TradeDetailDialog
        trade={selectedTrade}
        streamerMode={streamerMode}
        onClose={() => {
          setSelectedTrade(null);
          setReturnToTradeGroup(false);
        }}
        showBackButton={returnToTradeGroup}
        onBack={() => {
          setSelectedTrade(null);
          if (returnToTradeGroup) {
            setIsTradeGroupOpen(true);
          }
        }}
      />
      <TradeGroupDetailDialog
        open={isTradeGroupOpen && Boolean(tradeGroupDialog)}
        onOpenChange={(open) => {
          setIsTradeGroupOpen(open);
          if (!open) setReturnToTradeGroup(false);
        }}
        title={tradeGroupDialog?.title ?? ''}
        subtitle={tradeGroupDialog?.subtitle}
        trades={tradeGroupDialog?.trades ?? []}
        onOpenTrade={(trade) => {
          setIsTradeGroupOpen(false);
          setSelectedTrade(trade);
          setReturnToTradeGroup(true);
        }}
      />
    </section>
  );
}

function SummaryBox({
  title,
  value,
  subtitle,
  description,
  pills = [],
  progress,
  color = 'default',
}: {
  title: string;
  value: string;
  subtitle?: string;
  description?: string;
  pills?: SummaryPill[];
  progress?: number;
  color?: 'profit' | 'loss' | 'neutral' | 'default';
}) {
  const getPillClass = (tone: SummaryPill['tone'] = 'default') =>
    cn(
      'rounded-full border px-3 py-1 font-mono text-[11px] font-medium',
      tone === 'profit' && 'border-profit/40 bg-profit/10 text-profit',
      tone === 'loss' && 'border-loss/40 bg-loss/10 text-loss',
      tone === 'default' &&
        'border-border bg-background/70 text-muted-foreground'
    );

  return (
    <div className="rounded-2xl border border-border bg-card/95 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
      <div className="flex min-h-[118px] flex-col justify-between gap-2 p-3.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={cn(
            'font-mono text-xl font-semibold tracking-tight text-foreground',
            color === 'profit' && 'text-profit',
            color === 'loss' && 'text-loss',
            color === 'neutral' && 'text-muted-foreground'
          )}
        >
          {value}
        </div>
        {pills.map((pill) => (
          <span
            key={pill.label}
            className={getPillClass(pill.tone)}
          >
            {pill.label}
          </span>
        ))}
      </div>
      {description && (
        <p className="font-mono text-[11px] text-muted-foreground">
          {description}
        </p>
      )}
      {subtitle && (
        <div className="flex flex-wrap gap-1.5">
          {subtitle && (
            <span className="rounded-full border border-border bg-background/50 px-2 py-1 font-mono text-[10px] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
      )}
      {typeof progress === 'number' && (
        <div className="h-2 overflow-hidden rounded-full bg-secondary/40">
          <div
            className="h-full rounded-full bg-profit"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
      </div>
    </div>
  );
}
