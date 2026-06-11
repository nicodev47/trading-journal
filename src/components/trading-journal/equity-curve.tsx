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
import { Card, CardContent } from '@/components/ui/card';
import { getEquityCurveData } from '@/lib/calculations';
import { formatShortDate } from '@/lib/date-utils';
import type { Trade } from '@/lib/types/trade';

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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(() => getEquityCurveData(trades), [trades]);

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

  const handleChartClick = useCallback(
    (data: { activePayload?: Array<{ payload: { date: string } }> }) => {
      if (data?.activePayload?.[0]?.payload?.date && onPointClick) {
        onPointClick(data.activePayload[0].payload.date);
      }
    },
    [onPointClick]
  );

  return (
    <Card className="rounded-2xl border border-border bg-card/95 shadow-[0_16px_36px_rgba(0,0,0,0.24)]">
      <CardContent className="flex flex-col gap-3 p-4">
        <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Curva equity
        </span>

        {data.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center">
            <p className="font-mono text-sm text-muted-foreground">
              Nessun dato trade disponibile
            </p>
          </div>
        ) : (
          <div className="h-[180px]">
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
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`$${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Equity']}
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
          <p className="text-center font-mono text-[10px] text-muted-foreground">
            Clicca su un punto per vedere i dettagli del trade
          </p>
        )}
      </CardContent>
    </Card>
  );
}
