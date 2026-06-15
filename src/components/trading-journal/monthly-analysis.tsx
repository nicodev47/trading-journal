'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EquityCurve } from '@/components/trading-journal/equity-curve';
import { AdvancedStatsGrid } from '@/components/trading-journal/advanced-stats-grid';
import { AnalysisDiagnostics } from '@/components/trading-journal/analysis-diagnostics';
import { cn } from '@/lib/utils';
import { CUSTOM_MISTAKE_PREFIX, type Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

interface MonthlyAnalysisProps {
  trades: Trade[];
}

const ANALYSIS_MISTAKES = [
  { value: 'early_entry', emoji: '⏳', label: 'Entrata in Anticipo' },
  { value: 'late_entry', emoji: '🥶', label: 'Entrata in Ritardo' },
] as const;

type MistakeCount = {
  value: string;
  emoji: string;
  label: string;
  count: number;
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

export function MonthlyAnalysis({ trades }: MonthlyAnalysisProps) {
  const { streamerMode } = useStreamerMode();
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

  const mistakeStats = useMemo(() => {
    const mistakesMap = new Map<string, MistakeCount>(
      ANALYSIS_MISTAKES.map(
        (mistake): [string, MistakeCount] => [
          mistake.value,
          { ...mistake, count: 0 },
        ]
      )
    );

    yearFilteredTrades.forEach((trade) => {
      const mistakes = trade.mistakes ?? [];

      mistakes
        .filter((mistake) => mistake.startsWith(CUSTOM_MISTAKE_PREFIX))
        .forEach((mistake) => {
          if (!mistakesMap.has(mistake)) {
            mistakesMap.set(mistake, {
              value: mistake,
              emoji: '',
              label: mistake.slice(CUSTOM_MISTAKE_PREFIX.length),
              count: 0,
            });
          }
        });
    });

    yearFilteredTrades.forEach((trade) => {
      const mistakes = trade.mistakes ?? [];

      mistakes.forEach((mistakeValue) => {
        const current = mistakesMap.get(mistakeValue);

        if (current) {
          current.count += 1;
        }
      });
    });

    const totalYearTrades = yearFilteredTrades.length;
    const mistakeTrades = yearFilteredTrades.filter(
      (trade) => (trade.mistakes ?? []).length > 0
    );
    const tradesWithMistakes = mistakeTrades.length;
    const cleanTrades = totalYearTrades - tradesWithMistakes;
    const disciplineScore =
      totalYearTrades > 0
        ? Math.round((cleanTrades / totalYearTrades) * 100)
        : 100;

    const mistakes = Array.from(mistakesMap.values())
      .filter((mistake) => mistake.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((mistake) => {
        const percent =
          totalYearTrades > 0
            ? (mistake.count / totalYearTrades) * 100
            : 0;
        const heatColor =
          percent >= 80
            ? 'from-[#ff4d6d] to-[#ff2d55]'
            : percent >= 60
              ? 'from-[#ff4d6d]/95 to-[#ff2d55]/80'
              : percent >= 40
                ? 'from-[#ff4d6d]/85 to-[#ff2d55]/70'
                : percent >= 25
                  ? 'from-[#ff4d6d]/75 to-[#ff2d55]/60'
                  : percent >= 10
                    ? 'from-[#ff4d6d]/65 to-[#ff2d55]/50'
                    : 'from-[#ff4d6d]/55 to-[#ff2d55]/40';

        return {
          ...mistake,
          percent,
          heatColor,
        };
      });

    const disciplineColor =
      disciplineScore >= 65
        ? 'bg-profit'
        : disciplineScore >= 50
          ? 'bg-profit/50'
          : disciplineScore >= 25
            ? 'bg-loss/60'
            : 'bg-loss';
    const topMistake = mistakes[0];
    const tradesWithTopMistake = topMistake
      ? yearFilteredTrades.filter((trade) =>
          (trade.mistakes ?? []).includes(topMistake.value)
        )
      : [];
    const winningTradesWithTopMistake = tradesWithTopMistake.filter(
      (trade) => netPnl(trade) > 0
    ).length;
    const topMistakeWinRate =
      tradesWithTopMistake.length > 0
        ? (winningTradesWithTopMistake / tradesWithTopMistake.length) * 100
        : null;

    return {
      mistakes,
      tradesWithMistakes,
      cleanTrades,
      disciplineScore,
      disciplineColor,
      topMistake,
      topMistakeTradeCount: tradesWithTopMistake.length,
      topMistakeWinRate,
    };
  }, [yearFilteredTrades]);
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
        <SummaryBox title="P&L annuale" value={streamerMode ? '******' : formatCurrency(yearTotal)} color={yearTotal > 0 ? 'profit' : yearTotal < 0 ? 'loss' : 'neutral'} />
        <SummaryBox title="Winrate" value={formatPercent(yearWinRate)} subtitle={`${yearWins} win / ${yearLosses} loss`} />
        <SummaryBox title="Trade totali" value={yearTrades.toString()} />
        <SummaryBox title="Profit factor" value={!isFinite(profitFactor) ? '∞' : profitFactor.toFixed(2)} />
      </div>

      <div className="mb-4">
        <EquityCurve key={selectedYear} trades={yearFilteredTrades} />
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
        <div className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          P&L mensile
        </div>
        <div className="w-full overflow-x-auto">
          <div className="flex h-60 min-w-[760px] items-end gap-2 border-b border-border/70 px-2 pb-4 sm:min-w-0">
            {months.map((month) => {
              const height = Math.max(
                (Math.abs(month.totalPnl) / maxAbsPnl) * 172,
                month.totalPnl !== 0 ? 14 : 2
              );

              return (
                <div
                  key={month.monthName}
                  className="flex min-w-0 flex-1 flex-col items-center gap-2"
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
                          <span className="font-semibold text-teal-200">
                            {streamerMode
                              ? '******'
                              : formatCurrency(month.totalPnl)}
                          </span>
                        </div>
                        <div
                          className="w-11 rounded-t-lg bg-gradient-to-t from-emerald-950 via-teal-600 to-profit shadow-[0_0_12px_rgba(0,240,168,0.14)] transition-all duration-200 group-hover:scale-x-105 group-hover:brightness-110 group-hover:shadow-[0_0_22px_rgba(0,240,168,0.32)] sm:w-12"
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
          <div className="w-full overflow-x-auto">
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
                      className="flex min-w-0 flex-1 flex-col items-center gap-2"
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
                              className="w-11 rounded-t-lg bg-gradient-to-t from-emerald-950 via-teal-700 to-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.12)] transition-all duration-200 group-hover:scale-x-105 group-hover:brightness-110 group-hover:shadow-[0_0_22px_rgba(45,212,191,0.28)] sm:w-12"
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
              Mistake Tracking
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Errori più frequenti registrati nei trade.
            </p>
          </div>

          <div className="space-y-3">
            {mistakeStats.mistakes.length > 0 ? (
              mistakeStats.mistakes.map((mistake) => (
                <div
                  key={mistake.value}
                  className="grid grid-cols-[140px_1fr_32px] items-center gap-4"
                >
                  <span className="font-mono text-xs text-foreground">
                    {mistake.emoji && (
                      <span className="mr-2" aria-hidden="true">
                        {mistake.emoji}
                      </span>
                    )}
                    {mistake.label}
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r transition-all duration-200 hover:brightness-110 hover:drop-shadow-[0_0_6px_rgba(255,77,109,0.45)] ${mistake.heatColor}`}
                      style={{ width: `${mistake.percent}%` }}
                    />
                  </div>
                  <span className="min-w-6 text-right font-mono text-xs text-muted-foreground">
                    {mistake.count}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-background/50 p-4 font-mono text-xs text-muted-foreground">
                Nessun errore registrato.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/95 p-3.5 font-mono shadow-[0_12px_28px_rgba(0,0,0,0.18)] sm:p-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Discipline Score
          </div>

          <div className="mt-2.5 text-2xl font-semibold text-foreground">
            {mistakeStats.disciplineScore} / 100
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>{mistakeStats.cleanTrades} trade corretti</span>
            <span>{mistakeStats.tradesWithMistakes} trade con errori</span>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all ${mistakeStats.disciplineColor}`}
              style={{ width: `${mistakeStats.disciplineScore}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/95 p-3.5 font-mono shadow-[0_12px_28px_rgba(0,0,0,0.18)] sm:p-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Errore più commesso
          </div>

          <div className="mt-2.5 text-xl font-semibold text-foreground">
            {mistakeStats.topMistake ? (
              <>
                <span className="mr-2" aria-hidden="true">
                  {mistakeStats.topMistake.emoji}
                </span>
                {mistakeStats.topMistake.label}
              </>
            ) : (
              'Errore più commesso: —'
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {mistakeStats.topMistakeTradeCount}{' '}
            {mistakeStats.topMistakeTradeCount === 1
              ? 'volta commesso'
              : 'volte commesso'}
          </div>
          <div className="mt-3 flex items-baseline gap-2 text-[11px] text-muted-foreground">
            <p>Winrate:</p>
            <p
              className={cn(
                'text-base font-semibold',
                mistakeStats.topMistakeWinRate === null
                  ? 'text-muted-foreground'
                  : mistakeStats.topMistakeWinRate >= 50
                    ? 'text-profit'
                    : 'text-loss'
              )}
            >
              {mistakeStats.topMistakeWinRate === null
                ? '—'
                : formatPercent(mistakeStats.topMistakeWinRate)}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <AdvancedStatsGrid trades={yearFilteredTrades} extended />
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
