'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEquityCurveData } from '@/lib/calculations';
import { formatShortDate } from '@/lib/date-utils';
import type { Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

interface EquityCurveProps {
  trades: Trade[];
  onOpenTradeGroup?: (payload: {
    title: string;
    subtitle?: string;
    trades: Trade[];
  }) => void;
  onOpenTrade?: (trade: Trade) => void;
}

type EquityPoint = {
  date: string;
  displayDate?: string;
  equity: number;
  pnl: number;
  tradeIds?: string[];
  isStart?: boolean;
};

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: EquityPoint;
  active?: boolean;
  strokeColor: string;
  onPointClick?: (point: EquityPoint) => void;
}

interface EquityTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: {
      displayDate?: string;
      date?: string;
      equity?: number;
    };
  }>;
  streamerMode: boolean;
}

const ITALIAN_MONTHS = [
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
] as const;

function CustomDot({
  cx,
  cy,
  payload,
  active = false,
  strokeColor,
  onPointClick,
}: CustomDotProps) {
  if (!cx || !cy || !payload) return null;
  const isClickable = !payload.isStart && Boolean(onPointClick);

  return (
    <circle
      cx={cx}
      cy={cy}
      r={active ? 6 : 5}
      fill={active ? strokeColor : 'transparent'}
      stroke={active ? '#fff' : 'transparent'}
      strokeWidth={active ? 2 : 0}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
      onClick={(event) => {
        event.stopPropagation();
        if (isClickable) {
          onPointClick?.(payload);
        }
      }}
    />
  );
}

function CustomEquityTooltip({
  active,
  payload,
  streamerMode,
}: EquityTooltipProps) {
  const item = payload?.[0]?.payload;

  if (!active || !item) return null;

  return (
    <div className="min-w-36 rounded-xl border border-border bg-popover px-3 py-2.5 font-mono text-xs shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
      <p className="font-semibold text-foreground">
        {item.displayDate ?? item.date ?? '—'}
      </p>
      <p className="mt-1 text-[11px] font-semibold text-profit">
        Equity:{' '}
        {streamerMode
          ? '******'
          : `$${(item.equity ?? 0).toLocaleString('it-IT', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
      </p>
    </div>
  );
}

export function EquityCurve({
  trades,
  onOpenTradeGroup,
  onOpenTrade,
}: EquityCurveProps) {
  const { streamerMode } = useStreamerMode();
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  const latestTradeMonth = useMemo(() => {
    const validDates = trades
      .map((trade) => new Date(trade.exitDate))
      .filter((date) => !Number.isNaN(date.getTime()));

    if (validDates.length === 0) {
      return new Date();
    }

    const latestDate = validDates.reduce((latest, date) =>
      date.getTime() > latest.getTime() ? date : latest
    );

    return new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
  }, [trades]);

  const selectedMonthTrades = useMemo(() => {
    if (!selectedMonth) return [];

    return trades.filter((trade) => {
      const tradeDate = new Date(trade.exitDate);

      return (
        !Number.isNaN(tradeDate.getTime()) &&
        tradeDate.getFullYear() === selectedMonth.getFullYear() &&
        tradeDate.getMonth() === selectedMonth.getMonth()
      );
    });
  }, [selectedMonth, trades]);

  const displayedTrades =
    selectedMonth && selectedMonthTrades.length > 0
      ? selectedMonthTrades
      : trades;

  const data = useMemo(
    () => getEquityCurveData(displayedTrades),
    [displayedTrades]
  );

  const formattedData = useMemo(() => {
    return data.map(d => ({
      ...d,
      displayDate: d.displayDate ?? formatShortDate(d.date),
    }));
  }, [data]);

  const isPositive = data.length > 0 && data[data.length - 1].equity >= 0;

  // Use explicit colors that will show as white/light on dark backgrounds
  const strokeColor = isPositive ? '#22c55e' : '#ef4444';
  const fillColorStart = isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
  const fillColorEnd = isPositive ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)';

  // White color for axis text
  const axisTextColor = '#e5e5e5';

  const changeMonth = (offset: number) => {
    const baseMonth = selectedMonth ?? latestTradeMonth;
    setSelectedMonth(
      new Date(baseMonth.getFullYear(), baseMonth.getMonth() + offset, 1)
    );
  };

  const selectedMonthLabel =
    selectedMonth && selectedMonthTrades.length > 0
      ? `${ITALIAN_MONTHS[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`
      : 'Equity Totale';

  const handleEquityPointClick = (point: EquityPoint) => {
    if (point.isStart) return;

    const pointTrades = point.tradeIds?.length
      ? displayedTrades.filter((trade) => point.tradeIds?.includes(trade.id))
      : displayedTrades.filter(
          (trade) => trade.exitDate.split('T')[0] === point.date
        );

    if (pointTrades.length > 0 && onOpenTradeGroup) {
      onOpenTradeGroup({
        title: `Trade del ${point.date.split('-').reverse().join('/')}`,
        subtitle: 'Operazioni incluse nella curva equity.',
        trades: pointTrades,
      });
      return;
    }

    if (pointTrades.length === 1 && onOpenTrade) {
      onOpenTrade(pointTrades[0]);
    }
  };
  const canClickPoints = Boolean(onOpenTradeGroup || onOpenTrade);

  return (
    <div className="max-w-full overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-3 sm:px-4">
        <h2 className="font-sans text-[15px] font-bold tracking-[-0.03em] text-foreground">
          Curva Equity
        </h2>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:flex-none sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 rounded-lg text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            onClick={() => changeMonth(-1)}
            aria-label="Mese precedente"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="min-w-0 flex-1 truncate text-center font-sans text-[13px] font-bold capitalize tracking-[-0.04em] text-foreground sm:min-w-[150px] sm:flex-none sm:text-[15px]">
            {selectedMonthLabel}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 rounded-lg text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            onClick={() => changeMonth(1)}
            aria-label="Mese successivo"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="p-3 sm:p-6">
        {data.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center">
            <p className="font-mono text-sm text-muted-foreground">
              Nessun trade disponibile per generare la curva equity.
            </p>
          </div>
        ) : (
          <div className="h-[240px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={formattedData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={fillColorStart} />
                    <stop offset="95%" stopColor={fillColorEnd} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                  vertical={false}
                />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 10, fill: axisTextColor }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: axisTextColor }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => streamerMode ? '******' : `$${value}`}
                />
                <Tooltip
                  content={
                    <CustomEquityTooltip streamerMode={streamerMode} />
                  }
                  cursor={{
                    stroke: 'hsl(var(--border))',
                    strokeWidth: 1,
                  }}
                  position={{ y: 80 }}
                  wrapperStyle={{ outline: 'none', pointerEvents: 'none' }}
                  allowEscapeViewBox={{ x: false, y: true }}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke={strokeColor}
                  strokeWidth={2}
                  fill="url(#equityGradient)"
                  activeDot={(props) => (
                    <CustomDot
                      {...props}
                      active
                      strokeColor={strokeColor}
                      onPointClick={canClickPoints ? handleEquityPointClick : undefined}
                    />
                  )}
                  dot={
                    canClickPoints
                      ? (props) => (
                          <CustomDot
                            {...props}
                            strokeColor={strokeColor}
                            onPointClick={handleEquityPointClick}
                          />
                        )
                      : false
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {canClickPoints && data.length > 0 && (
          <p className="mt-3 text-center font-mono text-[10px] text-muted-foreground">
            Clicca su un punto per vedere i dettagli del trade
          </p>
        )}
      </div>
    </div>
  );
}
