'use client';

import { useMemo, useState, useCallback } from 'react';
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
  onPointClick?: (date: string) => void;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: { date: string; equity: number; tradeId?: string };
  onPointClick?: (date: string) => void;
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

function CustomDot({ cx, cy, payload, onPointClick }: CustomDotProps) {
  if (!cx || !cy || !payload) return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill="transparent"
      stroke="transparent"
      style={{ cursor: 'pointer' }}
      onClick={() => {
        if (payload.date && onPointClick) {
          onPointClick(payload.date);
        }
      }}
    />
  );
}

export function EquityCurve({ trades, onPointClick }: EquityCurveProps) {
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
      displayDate: formatShortDate(d.date),
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

  const handleChartClick = useCallback(
    (data: { activePayload?: Array<{ payload: { date: string } }> }) => {
      if (data?.activePayload?.[0]?.payload?.date && onPointClick) {
        onPointClick(data.activePayload[0].payload.date);
      }
    },
    [onPointClick]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="font-sans text-[15px] font-bold tracking-[-0.03em] text-foreground">
          Curva Equity
        </h2>

        <div className="flex items-center gap-2">
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

          <span className="min-w-[150px] text-center font-sans text-[15px] font-bold capitalize tracking-[-0.04em] text-foreground">
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

      <div className="p-5 sm:p-6">
        {data.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center">
            <p className="font-mono text-sm text-muted-foreground">
              Nessun trade disponibile per generare la curva equity.
            </p>
          </div>
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={formattedData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                onClick={handleChartClick}
                style={{ cursor: onPointClick ? 'pointer' : 'default' }}
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
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [
                    streamerMode
                      ? '******'
                      : `$${value.toLocaleString('it-IT', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`,
                    'Equity',
                  ]}
                  cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke={strokeColor}
                  strokeWidth={2}
                  fill="url(#equityGradient)"
                  activeDot={{
                    r: 6,
                    fill: strokeColor,
                    stroke: '#fff',
                    strokeWidth: 2,
                    cursor: 'pointer',
                  }}
                  dot={onPointClick ? <CustomDot onPointClick={onPointClick} /> : false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {onPointClick && data.length > 0 && (
          <p className="mt-3 text-center font-mono text-[10px] text-muted-foreground">
            Clicca su un punto per vedere i dettagli del trade
          </p>
        )}
      </div>
    </div>
  );
}
