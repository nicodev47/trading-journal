'use client';

import { useMemo, useState } from 'react';
import {
  addMonths,
  format,
  isSameMonth,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthYearPicker } from '@/components/trading-journal/month-year-picker';
import { TradeDetailDialog } from '@/components/trading-journal/trade-detail-dialog';
import { TradeGroupDetailDialog } from '@/components/trading-journal/trade-group-detail-dialog';
import { cn } from '@/lib/utils';
import { type Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import {
  getDateKey,
  getMonthDays,
} from '@/lib/date-utils';
import { isValidStatTrade } from '@/lib/calculations';

interface ExecutionMapProps {
  trades: Trade[];
}

interface DayExecutionData {
  realTrades: Trade[];
  realPnl: number;
}

type TradeGroupDialogState = {
  title: string;
  subtitle?: string;
  trades: Trade[];
};

type DayStatus = 'profit' | 'loss' | 'none';

const weekdays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const sundayStartWeekdays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

function getTradeDateKey(trade: Trade) {
  return trade.exitDate.split('T')[0] || trade.entryDate.split('T')[0] || '';
}

function netPnl(trade: Trade) {
  return trade.pnl - trade.commission;
}

function getInitialMonth(trades: Trade[]) {
  const latestTrade = trades
    .filter(isValidStatTrade)
    .map((trade) => new Date(trade.exitDate || trade.entryDate))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return startOfMonth(latestTrade ?? new Date());
}

function formatExecutionPnl(value: number, streamerMode: boolean) {
  if (streamerMode) return '******';

  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const formatted = Math.abs(value).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${sign}${formatted}`;
}

function getStatus(dayData?: DayExecutionData): DayStatus {
  if (!dayData || dayData.realTrades.length === 0) return 'none';
  if (dayData.realPnl > 0) return 'profit';
  if (dayData.realPnl < 0) return 'loss';
  return 'none';
}

function getStatusLabel(status: DayStatus) {
  switch (status) {
    case 'profit':
      return 'Profitto';
    case 'loss':
      return 'Perdita';
    case 'none':
      return 'Nessuna attività';
  }
}

export function ExecutionMap({ trades }: ExecutionMapProps) {
  const { streamerMode, sundayWeekStart } = useStreamerMode();
  const [selectedMonth, setSelectedMonth] = useState(() =>
    getInitialMonth(trades)
  );
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [tradeGroupDialog, setTradeGroupDialog] =
    useState<TradeGroupDialogState | null>(null);
  const [isTradeGroupOpen, setIsTradeGroupOpen] = useState(false);
  const [returnToTradeGroup, setReturnToTradeGroup] = useState(false);

  const dayDataByDate = useMemo(() => {
    const data = new Map<string, DayExecutionData>();

    trades.filter(isValidStatTrade).forEach((trade) => {
      const date = getTradeDateKey(trade);

      if (!date) return;

      const existing = data.get(date) || {
        realTrades: [],
        realPnl: 0,
      };

      existing.realTrades.push(trade);
      existing.realPnl += netPnl(trade);
      data.set(date, existing);
    });

    return data;
  }, [trades]);

  const calendarDays = useMemo(() => {
    return getMonthDays(selectedMonth, sundayWeekStart ? 0 : 1);
  }, [selectedMonth, sundayWeekStart]);
  const weekdayLabels = sundayWeekStart ? sundayStartWeekdays : weekdays;

  const openDayTradeGroup = (dateKey: string, dayTrades: Trade[]) => {
    if (dayTrades.length === 0) return;

    setTradeGroupDialog({
      title: `Trade del ${dateKey.split('-').reverse().join('/')}`,
      subtitle: 'Operazioni registrate nella Execution Map.',
      trades: dayTrades,
    });
    setIsTradeGroupOpen(true);
    setReturnToTradeGroup(false);
  };

  return (
    <section className="max-w-full rounded-2xl border border-border bg-card p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            EXECUTION MAP
          </div>
          <p className="mt-1.5 font-sans text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">
            Mappa mensile delle esecuzioni reali: profitto, perdita o nessuna attività.
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-lg border-border bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => setSelectedMonth((month) => subMonths(month, 1))}
            aria-label="Mese precedente"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <MonthYearPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            showTodayButton
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-lg border-border bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => setSelectedMonth((month) => addMonths(month, 1))}
            aria-label="Mese successivo"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekdayLabels.map((weekday) => (
          <div
            key={weekday}
            className="px-0.5 pb-1 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:px-1 sm:text-[10px] sm:tracking-[0.12em]"
          >
            {weekday}
          </div>
        ))}

        {calendarDays.map((day) => {
          const dateKey = getDateKey(day);
          const isCurrentMonth = isSameMonth(day, selectedMonth);
          const dayData = isCurrentMonth
            ? dayDataByDate.get(dateKey)
            : undefined;
          const status = getStatus(dayData);
          const hasTrades = Boolean(dayData?.realTrades.length);
          const tradeCount = dayData?.realTrades.length ?? 0;
          const hasFavorite = Boolean(
            dayData?.realTrades.some((trade) => trade.isFavorite)
          );

          if (!isCurrentMonth) {
            return (
              <div
                key={dateKey}
                aria-hidden="true"
                className="h-[54px] rounded-lg border border-border bg-background p-1.5 min-[380px]:h-[62px] sm:h-[80px] sm:rounded-xl sm:p-2.5"
              >
                <span className="font-mono text-[11px] font-semibold text-muted-foreground/25 sm:text-sm">
                  {format(day, 'd')}
                </span>
              </div>
            );
          }

          return (
            <div
              key={dateKey}
              className={cn(
                'group flex h-[54px] min-w-0 flex-col justify-between rounded-lg border border-border bg-secondary/20 p-1.5 text-muted-foreground transition min-[380px]:h-[62px] sm:h-[80px] sm:rounded-xl sm:p-2.5',
                'bg-background/40',
                hasTrades ? 'cursor-pointer hover:brightness-110' : 'cursor-default',
                !hasTrades && 'hover:border-profit/40',
                status === 'profit' &&
                  'border-profit/40 bg-profit/15 text-foreground hover:border-profit/70',
                status === 'loss' &&
                  'border-loss/40 bg-loss/15 text-foreground hover:border-loss/70'
              )}
              onClick={() => {
                if (!dayData?.realTrades.length) return;

                openDayTradeGroup(dateKey, dayData.realTrades);
              }}
              aria-label={`${dateKey}: ${getStatusLabel(status)}`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="font-mono text-[11px] font-semibold sm:text-sm">
                  {format(day, 'd')}
                </span>
                {hasFavorite && (
                  <span className="text-[11px] leading-none text-amber-300">
                    ★
                  </span>
                )}
              </div>

              {hasTrades && (
                <span
                  className={cn(
                    'truncate font-mono text-[8px] font-bold min-[380px]:text-[10px] sm:text-sm',
                    status === 'profit' && 'text-profit',
                    status === 'loss' && 'text-loss'
                  )}
                >
                  {formatExecutionPnl(dayData?.realPnl ?? 0, streamerMode)}
                </span>
              )}

              {hasTrades && (
                <span
                  className={cn(
                    'self-end font-mono text-[9px] text-muted-foreground sm:text-xs',
                    (status === 'profit' || status === 'loss') &&
                      'text-foreground/60'
                  )}
                >
                  {tradeCount}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[10px] text-muted-foreground sm:mt-5 sm:gap-x-5 sm:text-[11px]">
        <LegendItem color="bg-profit/80" label="Profitto" />
        <LegendItem color="bg-loss/80" label="Perdita" />
        <LegendItem color="bg-secondary/40" label="Nessuna attività" />
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

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-3.5 rounded-[5px] sm:size-4', color)} />
      {label}
    </span>
  );
}
