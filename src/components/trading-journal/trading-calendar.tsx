'use client';

import { useState, useMemo } from 'react';
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
import {
  getWeeksOfMonth,
  formatMonthYear,
  getDateKey,
  getWeekKey,
  nextMonth,
  prevMonth,
  isCurrentMonth as checkCurrentMonth,
  isToday as checkIsToday,
} from '@/lib/date-utils';
import { getDayData } from '@/lib/calculations';
import type { Trade, WeeklyPlan } from '@/lib/types/trade';
import type { JournalWorkspace } from '@/hooks/use-trades';

interface TradingCalendarProps {
  trades: Trade[];
  weeklyPlans: WeeklyPlan[];
  activeWorkspace: JournalWorkspace;
  onWorkspaceChange: (workspace: JournalWorkspace) => void;
  onResetStudentJournal: () => void;
  onDayClick: (date: string) => void;
  onWeekPlanClick: (weekKey: string, weekLabel: string) => void;
  onImport: () => void;
  onExport: () => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export function TradingCalendar({
  trades,
  weeklyPlans,
  activeWorkspace,
  onWorkspaceChange,
  onResetStudentJournal,
  onDayClick,
  onWeekPlanClick,
  onImport,
  onExport,
}: TradingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-1 font-sans text-[15px] font-bold tracking-[-0.03em] text-foreground">
            Calendario P/L
          </h2>

          <Button
            type="button"
            variant={activeWorkspace === 'personal' ? 'default' : 'outline'}
            size="sm"
            className="h-8 rounded-lg font-sans text-xs font-semibold border-border hover:bg-secondary hover:text-foreground"
            onClick={() => onWorkspaceChange('personal')}
          >
            👤 Personale
          </Button>

          <Button
            type="button"
            variant={activeWorkspace === 'student' ? 'default' : 'outline'}
            size="sm"
            className="h-8 rounded-lg font-sans text-xs font-semibold border-border hover:bg-secondary hover:text-foreground"
            onClick={() => onWorkspaceChange('student')}
          >
            👁️ Preview
          </Button>

          {activeWorkspace === 'student' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-2 rounded-lg border-loss/45 font-sans text-xs font-semibold text-loss hover:bg-loss/10 hover:text-loss"
              onClick={onResetStudentJournal}
            >
              <RotateCcw className="size-3" />
              Reset
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 max-sm:w-full max-sm:justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(prevMonth(currentMonth))}
            className="size-7 rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="min-w-[130px] text-center font-sans text-[15px] font-bold capitalize tracking-[-0.04em] text-foreground max-sm:min-w-[110px]">
            {formatMonthYear(currentMonth)}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(nextMonth(currentMonth))}
            className="size-7 rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </Button>

          <div className="ml-2 flex items-center gap-1.5 max-sm:ml-0 max-sm:w-full max-sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onImport}
              className="h-8 gap-2 rounded-lg font-sans text-xs font-semibold max-sm:flex-1"
            >
              <Upload className="size-3" />
              Importa
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-8 gap-2 rounded-lg font-sans text-xs font-semibold max-sm:flex-1"
            >
              <Download className="size-3" />
              Esporta
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <div className="flex w-full min-w-0 flex-col gap-px bg-border">
          <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_54px] gap-px sm:grid-cols-[repeat(7,minmax(0,1fr))_80px] lg:grid-cols-[repeat(7,minmax(0,1fr))_155px]">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="bg-card px-1 py-1.5 font-sans text-[11px] font-bold tracking-[-0.02em] text-muted-foreground/85 sm:px-2 sm:py-2 sm:text-xs"
              >
                {day}
              </div>
            ))}

            <div className="bg-card px-1 py-1.5 text-right font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/85 sm:px-2.5 sm:py-2.5 sm:text-xs lg:text-sm">
              <span className="sm:hidden">Sett</span>
              <span className="hidden sm:inline">Settimana</span>
            </div>
          </div>

          {weeks.map((week, weekIndex) => (
            <div
              key={weekIndex}
              className="grid grid-cols-[repeat(7,minmax(0,1fr))_54px] gap-px sm:grid-cols-[repeat(7,minmax(0,1fr))_80px] lg:grid-cols-[repeat(7,minmax(0,1fr))_155px]"
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
                    maxPnl={maxPnl}
                    minPnl={minPnl}
                    onClick={() => onDayClick(dateKey)}
                  />
                );
              })}

              <WeekSummary
                totalPnl={weekData[weekIndex].totalPnl}
                tradeCount={weekData[weekIndex].tradeCount}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-3 py-2">
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

        <span className="max-w-full font-sans text-xs font-medium text-muted-foreground max-sm:basis-full">
          — l’intensità scala in base ai tuoi giorni migliori/peggiori
        </span>
      </div>
    </div>
  );
}
