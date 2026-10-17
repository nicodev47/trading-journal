'use client';

import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import type { AccountSim } from '@/lib/propfirm/engine';
import { formatDate, useMoney } from './shared';

/** Balance day by day, the drawdown limit as steps and, for evaluations, the profit target. */
export function BalanceChart({
  sim,
  size,
  drawdownAmount,
  targetBalance,
}: {
  sim: AccountSim;
  size: number;
  drawdownAmount: number;
  targetBalance: number | null;
}) {
  const money = useMoney();
  const { streamerMode } = useStreamerMode();
  const data = [
    { label: 'Inizio', balance: size, floor: size - drawdownAmount },
    ...sim.days.map(row => ({
      label: formatDate(row.date).replace(/ \d{4}$/, ''),
      balance: row.balance,
      floor: row.floor,
    })),
  ];
  const values = data.flatMap(point => [point.balance, point.floor]);
  const step = Math.max(500, Math.ceil((Math.max(...values) - Math.min(...values)) / 8 / 500) * 500);
  const min = Math.floor(Math.min(...values) / step) * step;
  const max = Math.ceil(Math.max(...values) / step) * step + step;
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, index) => min + index * step);

  return (
    <div className="rounded-xl border border-border bg-background/30 p-4">
      <div className="mb-3 flex items-center gap-4 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-profit" />
          Saldo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-loss" />
          Minimo
        </span>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d27b" stopOpacity={0.38} />
                <stop offset="100%" stopColor="#34d27b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="minimumFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6568" stopOpacity={0.14} />
                <stop offset="100%" stopColor="#ff6568" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              orientation="right"
              domain={[min, max]}
              ticks={ticks}
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
              tickLine={false}
              axisLine={false}
              width={58}
              tickFormatter={value => (streamerMode ? '***' : `$${Math.round(value).toLocaleString('en-US')}`)}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.18)' }}
              contentStyle={{ background: '#111114', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 12 }}
              formatter={(value, name) => [streamerMode ? '******' : money.usd(Number(value)), name]}
            />
            <Area type="monotone" dataKey="floor" name="Minimo" stroke="#ff6568" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#minimumFill)" dot={false} activeDot={false} />
            <Area type="monotone" dataKey="balance" name="Saldo" stroke="#4ade9a" strokeWidth={2.5} fill="url(#balanceFill)" dot={false} activeDot={{ r: 4, fill: '#4ade9a', stroke: '#0f0f11' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
