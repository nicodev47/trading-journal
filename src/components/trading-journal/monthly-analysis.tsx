'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EquityCurve } from '@/components/trading-journal/equity-curve';
import { AdvancedStatsGrid } from '@/components/trading-journal/advanced-stats-grid';
import { AnalysisDiagnostics } from '@/components/trading-journal/analysis-diagnostics';
import { ExecutionMap } from '@/components/trading-journal/execution-map';
import { TradeDetailDialog } from '@/components/trading-journal/trade-detail-dialog';
import { TradeGroupDetailDialog } from '@/components/trading-journal/trade-group-detail-dialog';
import { calculateStatistics } from '@/lib/calculations';
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

function formatProfitFactor(value: number) {
  if (!isFinite(value)) return '∞';
  if (isNaN(value)) return '—';
  return value.toFixed(2);
}

function getTagLabel(value: string) {
  const standardTag = TRADE_TAGS.find((tag) => tag.value === value);

  if (standardTag) return `${standardTag.emoji} ${standardTag.label}`;
  if (value.startsWith(CUSTOM_TAG_PREFIX)) {
    return value.slice(CUSTOM_TAG_PREFIX.length);
  }

  return value;
}

function getTradeTime(trade: Trade) {
  const source = trade.exitDate || trade.entryDate;
  return source?.split('T')[1]?.slice(0, 5) || '—';
}

function getTradeDateLabel(trade: Trade) {
  const date = new Date(trade.exitDate || trade.entryDate);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getBestSetup(trades: Trade[]) {
  const setupStats = new Map<string, { trades: number; wins: number }>();

  trades.forEach((trade) => {
    const setup = trade.strategy?.trim();

    if (!setup) return;

    const stats = setupStats.get(setup) ?? { trades: 0, wins: 0 };
    stats.trades += 1;
    if (netPnl(trade) > 0) stats.wins += 1;
    setupStats.set(setup, stats);
  });

  return Array.from(setupStats.entries()).reduce<{
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
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
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
  const selectedMonthDetail =
    selectedMonthIndex !== null ? months[selectedMonthIndex] : null;
  const selectedMonthStats = useMemo(() => {
    if (!selectedMonthDetail) return null;

    const stats = calculateStatistics(selectedMonthDetail.monthTrades);
    const longTrades = selectedMonthDetail.monthTrades.filter(
      (trade) => trade.direction === 'long'
    ).length;
    const shortTrades = selectedMonthDetail.monthTrades.filter(
      (trade) => trade.direction === 'short'
    ).length;

    return {
      stats,
      bestSetup: getBestSetup(selectedMonthDetail.monthTrades),
      longTrades,
      shortTrades,
      sortedTrades: [...selectedMonthDetail.monthTrades].sort(
        (a, b) =>
          new Date(b.exitDate).getTime() - new Date(a.exitDate).getTime()
      ),
    };
  }, [selectedMonthDetail]);

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

  const openMonthDetail = (monthIndex: number) => {
    const month = months[monthIndex];

    if (!month || month.trades === 0) return;

    setSelectedMonthIndex(monthIndex);
  };

  return (
    <section className="max-w-full pb-6 md:pb-8" data-tutorial="analysis-section">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 md:mb-4">
        <div className="min-w-0">
          <h2 className="font-mono text-base font-semibold tracking-wide text-foreground">
            Analisi annuale
          </h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Analisi annuale delle performance operative e dei pattern del journal.
          </p>
        </div>

        <div className="flex items-center gap-2 max-md:w-full max-md:justify-between">
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

      <div data-tour-target="analysis-overview">
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
            trades={trades}
            onOpenTradeGroup={(payload) =>
              openTradeGroup(
                payload.title,
                payload.subtitle ?? 'Operazioni incluse nella curva equity.',
                payload.trades
              )
            }
          />
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card/95 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
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

      <div className="mb-4 rounded-2xl border border-border bg-card/95 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
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
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Performance mese per mese
            </div>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              Clicca un mese con dati per vedere statistiche e trade.
            </p>
          </div>
        </div>
        <div className="ej-scrollbar w-full overflow-x-auto">
          <div className="min-w-[960px]">
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.9fr_0.9fr_1fr_1fr_64px] border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Mese</span>
          <span>P&L netto</span>
          <span>Trade</span>
          <span>Win %</span>
          <span>% giorni positivi</span>
          <span>Profit factor</span>
          <span>Giorno migliore</span>
          <span>Giorno peggiore</span>
          <span className="sr-only">Apri</span>
        </div>
        {months.map((month) => {
          const isClickable = month.trades > 0;

          return (
          <div
            key={month.monthName}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-label={
              isClickable
                ? `Apri performance ${month.monthName} ${selectedYear}`
                : undefined
            }
            onClick={() => openMonthDetail(month.monthIndex)}
            onKeyDown={(event) => {
              if (!isClickable) return;
              if (event.key !== 'Enter' && event.key !== ' ') return;

              event.preventDefault();
              openMonthDetail(month.monthIndex);
            }}
            className={cn(
              'grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.9fr_0.9fr_1fr_1fr_64px] items-center border-b border-border/70 px-4 py-3 font-mono text-xs outline-none last:border-b-0',
              isClickable
                ? 'cursor-pointer transition hover:bg-profit/[0.035] hover:shadow-[inset_3px_0_0_rgba(0,240,168,0.55)] focus-visible:bg-profit/[0.06] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-profit/60'
                : 'text-muted-foreground/55'
            )}
          >
            <span className={isClickable ? 'text-foreground' : 'text-muted-foreground/55'}>
              {month.monthName}
            </span>
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
            <span className="flex justify-end">
              {isClickable && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-border bg-background/50 px-3 font-mono text-xs text-muted-foreground hover:border-profit/50 hover:bg-secondary hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    openMonthDetail(month.monthIndex);
                  }}
                >
                  Apri
                </Button>
              )}
            </span>
          </div>
          );
        })}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <AnalysisDiagnostics trades={yearFilteredTrades} />
      </div>

      <div className="mb-4">
        <div className="rounded-2xl border border-border bg-card/95 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
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
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 font-mono text-xs sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] sm:gap-3">
                    <span className="truncate text-foreground">{tag.label}</span>
                    <span className="text-muted-foreground">
                      {tag.tradeCount} trade
                    </span>
                    <span
                      className={cn(
                        'max-sm:col-span-2',
                        tag.totalPnl > 0 && 'text-profit',
                        tag.totalPnl < 0 && 'text-loss',
                        tag.totalPnl === 0 && 'text-muted-foreground'
                      )}
                    >
                      {streamerMode ? '******' : formatCurrency(tag.totalPnl)}
                    </span>
                    <span className="text-muted-foreground max-sm:col-span-2">
                      {formatPercent(tag.winRate)} WR
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg border-border bg-background/50 px-3 font-mono text-xs text-muted-foreground hover:border-profit/50 hover:bg-secondary hover:text-foreground max-sm:col-span-2 max-sm:w-full"
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

      <Dialog
        open={Boolean(selectedMonthDetail && selectedMonthStats)}
        onOpenChange={(open) => {
          if (!open) setSelectedMonthIndex(null);
        }}
      >
        {selectedMonthDetail && selectedMonthStats && (
          <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-5xl overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            <DialogHeader className="border-b border-border px-4 py-3.5 text-left sm:px-5 sm:py-4">
              <DialogTitle className="font-mono text-base text-foreground sm:text-lg">
                Performance — {selectedMonthDetail.monthName} {selectedYear}
              </DialogTitle>
              <DialogDescription className="font-sans text-sm">
                Statistiche e operazioni del mese selezionato.
              </DialogDescription>
            </DialogHeader>

            <div className="ej-scrollbar max-h-[calc(92dvh-8.5rem)] overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
              <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <MonthlyMetric
                  label="P&L netto"
                  value={
                    streamerMode
                      ? '******'
                      : formatCurrency(selectedMonthStats.stats.totalPnl)
                  }
                  tone={
                    selectedMonthStats.stats.totalPnl > 0
                      ? 'profit'
                      : selectedMonthStats.stats.totalPnl < 0
                        ? 'loss'
                        : 'default'
                  }
                />
                <MonthlyMetric
                  label="Trade"
                  value={`${selectedMonthStats.stats.totalTrades}`}
                  detail={`${selectedMonthStats.stats.winningTrades} win / ${selectedMonthStats.stats.losingTrades} loss`}
                />
                <MonthlyMetric
                  label="Win rate"
                  value={formatPercent(selectedMonthStats.stats.winRate)}
                  detail={`${selectedMonthStats.stats.greenDays} giorni positivi`}
                  tone={selectedMonthStats.stats.winRate >= 50 ? 'profit' : 'loss'}
                />
                <MonthlyMetric
                  label="Profit factor"
                  value={formatProfitFactor(selectedMonthStats.stats.profitFactor)}
                />
                <MonthlyMetric
                  label="Giorni operativi"
                  value={`${selectedMonthStats.stats.tradingDays}`}
                  detail={`Media ${selectedMonthStats.stats.avgTradesPerDay.toFixed(1)} trade/giorno`}
                />
                <MonthlyMetric
                  label="Giorno migliore"
                  value={
                    streamerMode
                      ? '******'
                      : formatCurrency(selectedMonthStats.stats.bestDay)
                  }
                  tone={selectedMonthStats.stats.bestDay > 0 ? 'profit' : 'default'}
                />
                <MonthlyMetric
                  label="Giorno peggiore"
                  value={
                    streamerMode
                      ? '******'
                      : formatCurrency(selectedMonthStats.stats.worstDay)
                  }
                  tone={selectedMonthStats.stats.worstDay < 0 ? 'loss' : 'default'}
                />
                <MonthlyMetric
                  label="Setup migliore"
                  value={selectedMonthStats.bestSetup.name ?? '—'}
                  detail={
                    selectedMonthStats.bestSetup.name
                      ? `${selectedMonthStats.bestSetup.winRate.toFixed(0)}% WR · ${selectedMonthStats.bestSetup.trades} trade`
                      : 'Nessun setup registrato'
                  }
                  tone={selectedMonthStats.bestSetup.name ? 'profit' : 'default'}
                />
                <MonthlyMetric
                  label="Long vs Short"
                  value={`${selectedMonthStats.longTrades} / ${selectedMonthStats.shortTrades}`}
                  detail="long / short"
                />
                <MonthlyMetric
                  label="Media win"
                  value={
                    streamerMode
                      ? '******'
                      : formatCurrency(selectedMonthStats.stats.avgWin)
                  }
                  tone="profit"
                />
                <MonthlyMetric
                  label="Media loss"
                  value={
                    streamerMode
                      ? '******'
                      : formatCurrency(selectedMonthStats.stats.avgLoss)
                  }
                  tone="loss"
                />
              </section>

              <section className="mt-5 rounded-2xl border border-border bg-background/25">
                <div className="border-b border-border px-4 py-3">
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Trade del mese
                  </p>
                </div>

                <div className="divide-y divide-border/70">
                  {selectedMonthStats.sortedTrades.map((trade) => {
                    const pnl = netPnl(trade);
                    const note = trade.notes?.trim();

                    return (
                      <div
                        key={trade.id}
                        role="button"
                        tabIndex={0}
                        className="grid w-full grid-cols-1 gap-2 px-4 py-3 text-left transition hover:bg-profit/[0.035] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-profit/60 md:grid-cols-[96px_120px_72px_84px_64px_minmax(0,1fr)_64px]"
                        onClick={() => {
                          setSelectedMonthIndex(null);
                          setSelectedTrade(trade);
                          setReturnToTradeGroup(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') {
                            return;
                          }

                          event.preventDefault();
                          setSelectedMonthIndex(null);
                          setSelectedTrade(trade);
                          setReturnToTradeGroup(false);
                        }}
                      >
                        <div className="font-mono text-xs text-foreground">
                          {getTradeDateLabel(trade)}
                        </div>
                        <div
                          className={cn(
                            'font-mono text-xs font-semibold',
                            pnl > 0 && 'text-profit',
                            pnl < 0 && 'text-loss',
                            pnl === 0 && 'text-muted-foreground'
                          )}
                        >
                          {streamerMode ? '******' : formatCurrency(pnl)}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {trade.pair?.trim() || '—'}
                        </div>
                        <div className="font-mono text-xs capitalize text-muted-foreground">
                          {trade.direction || '—'}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {getTradeTime(trade)}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-mono text-xs text-foreground">
                            {trade.strategy?.trim() || '—'}
                          </p>
                          {trade.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {trade.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-md border border-profit/20 bg-profit/5 px-1.5 py-0.5 font-mono text-[10px] text-profit"
                                >
                                  {getTagLabel(tag)}
                                </span>
                              ))}
                              {trade.tags.length > 3 && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  +{trade.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          {note && (
                            <p className="truncate font-sans text-xs text-muted-foreground">
                              {note}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg border-border bg-background/50 px-3 font-mono text-xs text-muted-foreground hover:border-profit/50 hover:bg-secondary hover:text-foreground max-md:w-full"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedMonthIndex(null);
                              setSelectedTrade(trade);
                              setReturnToTradeGroup(false);
                            }}
                          >
                            Apri
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <DialogFooter className="border-t border-border bg-background/25 px-4 py-3.5 sm:px-5 sm:py-4 max-sm:[&_button]:w-full">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Chiudi
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

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
    <div className="max-w-full rounded-2xl border border-border bg-card/95 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
      <div className="flex min-h-[104px] min-w-0 flex-col justify-between gap-2 p-3 md:min-h-[118px] md:p-3.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">{title}</div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div
          className={cn(
            'break-words font-mono text-lg font-semibold tracking-tight text-foreground md:text-xl',
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

function MonthlyMetric({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'profit' | 'loss';
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background/45 p-3">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-2 break-words font-mono text-base font-semibold text-foreground',
          tone === 'profit' && 'text-profit',
          tone === 'loss' && 'text-loss'
        )}
      >
        {value}
      </p>
      {detail && (
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {detail}
        </p>
      )}
    </div>
  );
}
