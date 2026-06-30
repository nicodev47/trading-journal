'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  RotateCcw,
} from 'lucide-react';
import { CalendarDay } from './calendar-day';
import { WeekSummary } from './week-summary';
import { MonthYearPicker } from './month-year-picker';
import {
  getWeeksOfMonth,
  getDateKey,
  getWeekKey,
  nextMonth,
  prevMonth,
  isCurrentMonth as checkCurrentMonth,
  isToday as checkIsToday,
} from '@/lib/date-utils';
import { getDayData } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import type { Trade, WeeklyPlan } from '@/lib/types/trade';
import type { JournalWorkspace } from '@/hooks/use-trades';

interface TradingCalendarProps {
  trades: Trade[];
  weeklyPlans: WeeklyPlan[];
  activeWorkspace: JournalWorkspace;
  showResetButton?: boolean;
  onWorkspaceChange: (workspace: JournalWorkspace) => void;
  onResetStudentJournal: () => void;
  onResetBacktestJournal?: () => void;
  onDayClick: (date: string) => void;
  onWeekPlanClick: (weekKey: string, weekLabel: string) => void;
  onImport: () => void;
  onExport: () => void;
  importTargetMonth?: Date | null;
  tutorialDemoDateKey?: string;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export function TradingCalendar({
  trades,
  weeklyPlans,
  activeWorkspace,
  showResetButton = false,
  onWorkspaceChange,
  onResetStudentJournal,
  onResetBacktestJournal,
  onDayClick,
  onWeekPlanClick,
  onImport,
  onExport,
  importTargetMonth,
  tutorialDemoDateKey,
}: TradingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!importTargetMonth) return;

    setCurrentMonth(importTargetMonth);
  }, [importTargetMonth]);

  const weeks = useMemo(() => getWeeksOfMonth(currentMonth), [currentMonth]);

  const { maxPnl, minPnl } = useMemo(() => {
    let max = 0;
    let min = 0;

    trades.forEach((trade) => {
      const dateKey = trade.exitDate.split('T')[0];
      const dayData = getDayData(trades, dateKey);

      if (dayData.totalPnl > max) max = dayData.totalPnl;
      if (dayData.totalPnl < min) min = dayData.totalPnl;
    });

    return { maxPnl: max, minPnl: min };
  }, [trades]);

  const weekData = useMemo(() => {
    return weeks.map((week) => {
      let totalPnl = 0;
      let tradeCount = 0;

      week.forEach((day) => {
        const dateKey = getDateKey(day);
        const dayData = getDayData(trades, dateKey);

        totalPnl += dayData.totalPnl;
        tradeCount += dayData.tradeCount;
      });

      const weekKey = getWeekKey(week[0]);
      const plans = weeklyPlans || [];
      const weekPlan = plans.find((p) => p.weekKey === weekKey);

      const hasActualPlanData =
        weekPlan &&
        (weekPlan.approach !== '' ||
          (weekPlan.calendarScreenshots &&
            weekPlan.calendarScreenshots.length > 0) ||
          weekPlan.notes !== '');

      const startDate = week[0];
      const weekLabel = `Settimana del ${startDate.toLocaleDateString(
        'it-IT',
        { day: 'numeric', month: 'short' }
      )}`;

      return {
        totalPnl,
        tradeCount,
        weekKey,
        weekLabel,
        hasPlan: !!hasActualPlanData,
        approach: weekPlan?.approach || '',
      };
    });
  }, [weeks, trades, weeklyPlans]);

  const getWorkspaceButtonClass = (workspace: JournalWorkspace) => {
    const isActive = activeWorkspace === workspace;

    return cn(
      'h-8 rounded-lg border font-sans text-xs font-semibold transition-colors max-md:h-9 max-md:flex-1 max-md:px-2 max-[360px]:text-[11px]',
      isActive
        ? '!border-profit !bg-profit !text-background hover:!border-profit hover:!bg-profit hover:!text-background'
        : 'border-border bg-background/50 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground'
    );
  };

  return (
    <div
      className="flex max-w-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[0_18px_50px_rgba(0,0,0,0.25)]"
      data-tutorial="calendar"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 max-md:gap-2 max-md:px-3 max-md:py-2.5">
        <div
          className="flex min-w-0 flex-wrap items-center gap-2 max-md:w-full"
          data-tutorial="workspace-tabs"
        >
          <h2 className="mr-1 font-sans text-[15px] font-bold tracking-[-0.03em] text-foreground max-md:w-full">
            Calendario P/L
          </h2>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className={getWorkspaceButtonClass('personal')}
            onClick={() => onWorkspaceChange('personal')}
          >
            👤 Personale
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className={getWorkspaceButtonClass('backtest')}
            onClick={() => onWorkspaceChange('backtest')}
          >
            ⚙️ Backtest
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className={getWorkspaceButtonClass('student')}
            onClick={() => onWorkspaceChange('student')}
          >
            👁️ Preview
          </Button>

          {activeWorkspace === 'backtest' && showResetButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-2 rounded-lg border-loss/45 font-sans text-xs font-semibold text-loss hover:bg-loss/10 hover:text-loss max-md:h-9 max-md:flex-1"
              onClick={onResetBacktestJournal}
            >
              <RotateCcw className="size-3" />
              Reset
            </Button>
          )}

          {activeWorkspace === 'student' && trades.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-2 rounded-lg border-loss/45 font-sans text-xs font-semibold text-loss hover:bg-loss/10 hover:text-loss max-md:h-9 max-md:flex-1"
              onClick={onResetStudentJournal}
            >
              <RotateCcw className="size-3" />
              Reset
            </Button>
          )}
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2 max-md:ml-0 max-md:w-full max-md:justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(prevMonth(currentMonth))}
            className="size-8 rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <MonthYearPicker
            value={currentMonth}
            onChange={setCurrentMonth}
            triggerVariant="ghost"
            showTodayButton
            triggerClassName="inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive has-[>svg]:px-3 capitalize h-auto min-w-[150px] rounded-xl border border-transparent bg-transparent px-4 py-1 text-base font-semibold text-foreground shadow-none ring-0 transition-colors duration-200 hover:bg-white/10 hover:text-foreground dark:bg-transparent dark:hover:bg-white/10 dark:hover:text-foreground max-md:min-w-0 max-md:flex-1 max-md:px-2 max-md:text-sm"
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(nextMonth(currentMonth))}
            className="size-8 rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div
          className="flex items-center gap-2 max-md:w-full"
          data-tutorial="import-export-buttons"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={onImport}
            className="h-9 gap-2 rounded-lg font-sans text-xs font-semibold max-md:flex-1"
          >
            <Upload className="size-3" />
            Importa
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-9 gap-2 rounded-lg font-sans text-xs font-semibold max-md:flex-1"
          >
            <Download className="size-3" />
            Esporta
          </Button>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <div className="flex w-full min-w-0 flex-col gap-px bg-border">
          <div className="grid grid-cols-7 gap-px sm:grid-cols-[repeat(7,minmax(0,1fr))_80px] lg:grid-cols-[repeat(7,minmax(0,1fr))_155px]">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="bg-card px-1 py-1.5 font-sans text-[11px] font-bold tracking-[-0.02em] text-muted-foreground/85 sm:px-2 sm:py-2 sm:text-xs"
              >
                {day}
              </div>
            ))}

            <div className="hidden bg-card px-1 py-1.5 text-right font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/85 sm:block sm:px-2.5 sm:py-2.5 sm:text-xs lg:text-sm">
              <span className="sm:hidden">Sett</span>
              <span className="hidden sm:inline">Settimana</span>
            </div>
          </div>

          {weeks.map((week, weekIndex) => (
            <div
              key={weekIndex}
              className="grid grid-cols-7 gap-px sm:grid-cols-[repeat(7,minmax(0,1fr))_80px] lg:grid-cols-[repeat(7,minmax(0,1fr))_155px]"
            >
              {week.map((day) => {
                const dateKey = getDateKey(day);
                const dayData = getDayData(trades, dateKey);
                const hasTrades = dayData.tradeCount > 0;

                return (
                  <CalendarDay
                    key={dateKey}
                    date={day}
                    dayData={hasTrades ? dayData : null}
                    isCurrentMonth={checkCurrentMonth(day, currentMonth)}
                    isToday={checkIsToday(day)}
                    tutorialTarget={
                      dateKey === tutorialDemoDateKey
                        ? 'current-demo-day'
                        : undefined
                    }
                    maxPnl={maxPnl}
                    minPnl={minPnl}
                    onClick={() => onDayClick(dateKey)}
                  />
                );
              })}

              <div className="hidden sm:block">
                <WeekSummary
                  totalPnl={weekData[weekIndex].totalPnl}
                  tradeCount={weekData[weekIndex].tradeCount}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-3 py-2 max-md:gap-x-3 max-md:px-3 max-md:text-[11px]">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-sm bg-muted" />
          <span className="font-sans text-xs font-medium text-muted-foreground">
            Nessun dato
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="size-3 rounded-sm bg-profit/70" />
          <span className="font-sans text-xs font-medium text-muted-foreground">
            Positivo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="size-3 rounded-sm bg-[#ff4d70]/70" />
          <span className="font-sans text-xs font-medium text-muted-foreground">
            Negativo
          </span>
        </div>

        <span className="max-w-full font-sans text-xs font-medium text-muted-foreground max-md:basis-full">
          — l’intensità scala in base ai tuoi giorni migliori/peggiori
        </span>
      </div>
    </div>
  );
}
