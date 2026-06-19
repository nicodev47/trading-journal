'use client';

import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
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

function getDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function getTradeDateKey(trade: Trade) {
  return trade.exitDate.split('T')[0] || trade.entryDate.split('T')[0] || '';
}

function netPnl(trade: Trade) {
  return trade.pnl - trade.commission;
}

function getInitialMonth(trades: Trade[]) {
  const latestTrade = trades
    .map((trade) => new Date(trade.exitDate || trade.entryDate))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return startOfMonth(latestTrade ?? new Date());
}

function formatCompactMoney(value: number, streamerMode: boolean) {
  if (streamerMode) return '******';

  const sign = value > 0 ? '+' : '';
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1000) {
    return `${sign}${(value / 1000).toLocaleString('it-IT', {
      maximumFractionDigits: 1,
    })}k`;
  }

  return `${sign}${Math.round(value).toLocaleString('it-IT')}`;
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
  const { streamerMode } = useStreamerMode();
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

    trades.forEach((trade) => {
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
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let cursor = calendarStart;

    while (cursor <= calendarEnd) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }

    return days;
  }, [selectedMonth]);

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
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            EXECUTION MAP
          </div>
          <p className="mt-2 font-sans text-sm text-muted-foreground">
            Mappa mensile delle esecuzioni reali: profitto, perdita o nessuna attività.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      <div className="grid grid-cols-7 gap-2">
        {weekdays.map((weekday) => (
          <div
            key={weekday}
            className="px-1 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            {weekday}
          </div>
        ))}

        {calendarDays.map((day) => {
          const dateKey = getDateKey(day);
          const dayData = dayDataByDate.get(dateKey);
          const status = getStatus(dayData);
          const isCurrentMonth = isSameMonth(day, selectedMonth);
          const hasTrades = Boolean(dayData?.realTrades.length);
          const tradeCount = dayData?.realTrades.length ?? 0;
          const hasFavorite = Boolean(
            dayData?.realTrades.some((trade) => trade.isFavorite)
          );

          return (
            <div
              key={dateKey}
              className={cn(
                'group flex h-[72px] min-w-0 flex-col justify-between rounded-xl border border-border bg-secondary/20 p-2 text-muted-foreground transition sm:h-[80px] sm:p-2.5',
                isCurrentMonth && 'bg-background/40',
                isCurrentMonth && hasTrades
                  ? 'cursor-pointer hover:brightness-110'
                  : 'cursor-default',
                isCurrentMonth && !hasTrades && 'hover:border-profit/40',
                status === 'profit' &&
                  isCurrentMonth &&
                  'border-profit/40 bg-profit/15 text-foreground hover:border-profit/70',
                status === 'loss' &&
                  isCurrentMonth &&
                  'border-loss/40 bg-loss/15 text-foreground hover:border-loss/70',
                !isCurrentMonth && 'pointer-events-none opacity-25'
              )}
              onClick={() => {
                if (!isCurrentMonth || !dayData?.realTrades.length) return;

                openDayTradeGroup(dateKey, dayData.realTrades);
              }}
              aria-label={`${dateKey}: ${getStatusLabel(status)}`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="font-mono text-xs font-semibold sm:text-sm">
                  {format(day, 'd')}
                </span>
                {hasFavorite && isCurrentMonth && (
                  <span className="text-[11px] leading-none text-amber-300">
                    ★
                  </span>
                )}
              </div>

              {hasTrades && isCurrentMonth && (
                <span
                  className={cn(
                    'truncate font-mono text-[11px] font-bold sm:text-sm',
                    status === 'profit' && 'text-profit',
                    status === 'loss' && 'text-loss'
                  )}
                >
                  {formatCompactMoney(dayData?.realPnl ?? 0, streamerMode)}
                </span>
              )}

              {hasTrades && isCurrentMonth && (
                <span
                  className={cn(
                    'self-end font-mono text-xs text-muted-foreground',
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

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[11px] text-muted-foreground">
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
