'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MAX_LEVEL,
  buildHeatmap,
  computeStreaks,
  getLevelsByDate,
  summarizeYear,
  toDateKey,
} from '@/lib/progress-tracker';
import type { DailyAnalysis, Trade } from '@/lib/types/trade';
import { getAccountDays } from '@/lib/propfirm/days';
import { getFirm } from '@/lib/propfirm/firms';
import type { PropAccount } from '@/lib/propfirm/types';
import { cn } from '@/lib/utils';
import { TradingCalendar } from '@/components/trading-journal/trading-calendar';
import { DailyAnalysisDialog } from './daily-analysis-dialog';

const LEVEL_CLASSES = ['bg-white/[0.06]', 'bg-profit/30', 'bg-profit/60', 'bg-profit'];
const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

interface ProgressTrackerPageProps {
  /** Executions of every account except Backtest and Preview. */
  trades: Trade[];
  propAccounts: PropAccount[];
  getJournalTrades: (journalId: string) => Trade[];
  dailyAnalyses: DailyAnalysis[];
  onSaveAnalysis: (entry: DailyAnalysis) => void;
  onDeleteAnalysis: (date: string) => void;
}

function StatTile({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <span className="font-sans text-xs font-medium text-muted-foreground">{title}</span>
      <span className="font-sans text-xl font-semibold tabular-nums tracking-tight">{value}</span>
      <span className="font-sans text-[11px] text-muted-foreground">{hint}</span>
    </div>
  );
}

export function ProgressTrackerPage({
  trades,
  propAccounts,
  getJournalTrades,
  dailyAnalyses,
  onSaveAnalysis,
  onDeleteAnalysis,
}: ProgressTrackerPageProps) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const levels = useMemo(
    () => getLevelsByDate(dailyAnalyses),
    [dailyAnalyses]
  );
  const streaks = useMemo(() => computeStreaks(levels, today), [levels, today]);
  const summary = useMemo(() => summarizeYear(year, levels), [year, levels]);
  const weeks = useMemo(() => buildHeatmap(year, levels), [year, levels]);
  const entryByDate = useMemo(
    () => new Map(dailyAnalyses.map(entry => [entry.date, entry])),
    [dailyAnalyses]
  );
  // Prop accounts on which something was executed, day by day.
  const propsByDate = useMemo(() => {
    const map = new Map<
      string,
      { id: string; initials: string; tile: string; logo?: string; logoOnDark?: boolean }[]
    >();

    propAccounts.forEach(account => {
      const firm = getFirm(account.firmId);

      getAccountDays(account, getJournalTrades).forEach(day => {
        map.set(day.date, [
          ...(map.get(day.date) ?? []),
          {
            id: account.id,
            initials: firm?.initials ?? account.firmName.slice(0, 2).toUpperCase(),
            logo: firm?.logo,
            logoOnDark: firm?.logoOnDark,
            tile: firm?.tile ?? 'from-[#2a2a2d] to-[#1f1f22] border-white/10',
          },
        ]);
      });
    });

    return map;
  }, [propAccounts, getJournalTrades]);
  const tradesByDate = useMemo(() => {
    const map = new Map<string, Trade[]>();

    trades.forEach(trade => {
      const key = (trade.exitDate || trade.entryDate || '').split('T')[0];

      map.set(key, [...(map.get(key) ?? []), trade]);
    });

    return map;
  }, [trades]);

  const monthLabelAt = weeks.map((week, index) => {
    const firstInYear = week.find(cell => cell.inYear);
    const previous = weeks[index - 1]?.find(cell => cell.inYear);

    if (!firstInYear) return null;

    const monthOf = Number(firstInYear.date.slice(5, 7)) - 1;

    return !previous || Number(previous.date.slice(5, 7)) - 1 !== monthOf ? monthOf : null;
  });

  const hoveredCell = hovered ? weeks.flat().find(cell => cell.date === hovered) : null;
  const hoveredText = hoveredCell
    ? `${new Date(`${hoveredCell.date}T12:00:00`).toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })}: ${hoveredCell.level === 0 ? 'nessuna analisi' : `${hoveredCell.level} di ${MAX_LEVEL} parti compilate`}`
    : 'Passa sopra un giorno per vedere i dettagli, clicca per aprirlo.';

  const todayKey = toDateKey(today);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 [&>*]:min-w-0">
        <StatTile
          title="Serie attuale"
          value={`${streaks.current} ${streaks.current === 1 ? 'giorno' : 'giorni'}`}
          hint="Giorni feriali di fila con analisi"
        />
        <StatTile
          title="Serie più lunga"
          value={`${streaks.longest} ${streaks.longest === 1 ? 'giorno' : 'giorni'}`}
          hint="Il tuo record"
        />
        <StatTile
          title={`Giorni con analisi nel ${year}`}
          value={String(summary.daysWithEntry)}
          hint="Almeno una parte compilata"
        />
        <StatTile
          title="Completamento medio"
          value={`${summary.completion}%`}
          hint="Parti compilate nei giorni con analisi"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="font-sans text-[15px] font-semibold tracking-tight">Costanza</h2>
            <p className="font-sans text-xs text-muted-foreground">
              Più il verde è intenso, più parti dell’analisi hai compilato quel giorno.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="size-8" onClick={() => setYear(year - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-14 text-center font-sans text-xs font-semibold tabular-nums">{year}</span>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setYear(year + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <div className="flex w-full min-w-0 gap-1.5 sm:gap-2">
            <div className="flex w-6 shrink-0 flex-col font-sans text-[9px] text-muted-foreground sm:w-7 sm:text-[10px]">
              <span className="h-4" />
              <div className="grid min-h-0 flex-1 grid-rows-7 items-center gap-[2px] sm:gap-[3px]">
                {['Lun', '', 'Mer', '', 'Ven', '', ''].map((label, index) => (
                  <span key={index} className="flex h-0 items-center overflow-visible">{label}</span>
                ))}
              </div>
            </div>
            <div
              className="grid min-w-0 flex-1 gap-[2px] sm:gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
            >
              {weeks.map((week, index) => (
                <div key={week[0].date} className="flex min-w-0 flex-col gap-[2px] sm:gap-[3px]">
                  <span className="h-4 whitespace-nowrap font-sans text-[9px] text-muted-foreground sm:text-[10px]">
                    {monthLabelAt[index] !== null ? MONTH_LABELS[monthLabelAt[index] as number] : ''}
                  </span>
                  {week.map(cell => (
                    <button
                      key={cell.date}
                      type="button"
                      aria-label={`${cell.date}: ${cell.level} parti compilate`}
                      disabled={!cell.inYear}
                      onMouseEnter={() => setHovered(cell.date)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => setSelectedDate(cell.date)}
                      className={cn(
                        'aspect-square w-full rounded-[2px] outline-none transition-transform focus-visible:ring-1 focus-visible:ring-ring sm:rounded-[3px]',
                        cell.inYear ? LEVEL_CLASSES[cell.level] : 'invisible',
                        cell.inYear && 'hover:scale-125',
                        cell.date === todayKey && 'ring-1 ring-white/50'
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
          <span className="font-sans text-xs text-muted-foreground">{hoveredText}</span>
          <div className="flex items-center gap-1.5 font-sans text-[11px] text-muted-foreground">
            Meno
            {LEVEL_CLASSES.map((className, index) => (
              <span key={index} className={cn('size-[16px] rounded-[3px]', className)} />
            ))}
            Più
          </div>
        </div>
      </div>

      <TradingCalendar
        readOnly
        trades={trades}
        weeklyPlans={[]}
        activeWorkspace="personal"
        onResetStudentJournal={() => {}}
        onDayClick={setSelectedDate}
        onWeekPlanClick={() => {}}
        onImport={() => {}}
        onExport={() => {}}
        analysisMode={{
          title: 'Calendario delle analisi',
          getCell: date => {
            const entry = entryByDate.get(date);

            return {
              level: levels.get(date) ?? 0,
              manual:
                Boolean(entry?.analysis.trim()) ||
                Boolean(entry?.observations.trim()) ||
                (entry?.attachments?.length ?? 0) > 0,
              props: propsByDate.get(date) ?? [],
            };
          },
        }}
      />

      {selectedDate && (
        <DailyAnalysisDialog
          open
          date={selectedDate}
          entry={entryByDate.get(selectedDate)}
          trades={tradesByDate.get(selectedDate) ?? []}
          onClose={() => setSelectedDate(null)}
          onSave={onSaveAnalysis}
          onDelete={onDeleteAnalysis}
        />
      )}
    </div>
  );
}
