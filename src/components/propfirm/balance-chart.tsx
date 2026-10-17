'use client';

import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  const values = data.flatMap(point => [point.balance, point.floor]).concat(targetBalance ?? []);
  const padding = Math.max(100, (Math.max(...values) - Math.min(...values)) * 0.08);
  const domain: [number, number] = [
    Math.floor((Math.min(...values) - padding) / 100) * 100,
    Math.ceil((Math.max(...values) + padding) / 100) * 100,
  ];

  return (
    <div className="rounded-xl border border-border bg-background/30 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-white" />Saldo</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-loss" />Limite di drawdown</span>
        {targetBalance !== null && (
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-profit" />Obiettivo</span>
        )}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} />
            <YAxis
              domain={domain}
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={value => (streamerMode ? '***' : `$${Math.round(value).toLocaleString('it-IT')}`)}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.2)' }}
              contentStyle={{ background: '#111114', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 12 }}
              formatter={(value, name) => [streamerMode ? '******' : money.usd(Number(value)), name]}
            />
            {targetBalance !== null && <ReferenceLine y={targetBalance} stroke="#30d158" strokeDasharray="5 4" />}
            <Line type="stepAfter" dataKey="floor" name="Limite" stroke="#ff453a" strokeDasharray="5 4" dot={false} strokeWidth={1.5} />
            <Area type="monotone" dataKey="balance" name="Saldo" stroke="#e5e5e5" strokeWidth={2} fill="#e5e5e5" fillOpacity={0.12} dot={{ r: 2.5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
