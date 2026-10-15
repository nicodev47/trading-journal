'use client';

import { useMemo } from 'react';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { getStrategyRows } from '@/lib/strategy-stats';
import type { Trade } from '@/lib/types/trade';
import { cn } from '@/lib/utils';

const money = (value: number) =>
  `${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

export function StrategiesPage({ trades }: { trades: Trade[] }) {
  const { streamerMode } = useStreamerMode();
  const rows = useMemo(() => getStrategyRows(trades), [trades]);
  const hide = (text: string) => (streamerMode ? '******' : text);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-16 text-center">
        <p className="font-sans text-base font-semibold">Nessuna strategia ancora</p>
        <p className="max-w-sm font-sans text-sm text-muted-foreground">
          Assegna un setup ai tuoi trade dal calendario: qui vedrai i risultati di ognuno.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-sans text-[15px] font-semibold tracking-tight">Risultati per setup</h2>
        <p className="mt-0.5 font-sans text-xs text-muted-foreground">
          Ordinati per P&L netto. I trade a P&L zero non vengono contati.
        </p>
      </div>

      <div className="ej-scrollbar overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse font-sans text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Setup</th>
              <th className="px-3 py-2.5 text-right font-medium">Trade</th>
              <th className="px-3 py-2.5 text-right font-medium">Win rate</th>
              <th className="px-3 py-2.5 text-right font-medium">P&L netto</th>
              <th className="px-3 py-2.5 text-right font-medium">Media win</th>
              <th className="px-3 py-2.5 text-right font-medium">Media loss</th>
              <th className="px-4 py-2.5 text-right font-medium">Profit factor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.name} className="border-b border-border/60 last:border-0 hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                <td className="px-3 py-3 text-right text-muted-foreground">{row.trades}</td>
                <td className="px-3 py-3 text-right">
                  <span className={cn(row.winRate >= 50 ? 'text-profit' : 'text-loss')}>
                    {row.winRate.toFixed(0)}%
                  </span>
                </td>
                <td
                  className={cn(
                    'px-3 py-3 text-right font-medium',
                    row.pnl > 0 ? 'text-profit' : row.pnl < 0 ? 'text-loss' : 'text-foreground'
                  )}
                >
                  {hide(money(row.pnl))}
                </td>
                <td className="px-3 py-3 text-right text-profit">
                  {row.wins ? hide(money(row.avgWin)) : '—'}
                </td>
                <td className="px-3 py-3 text-right text-loss">
                  {row.losses ? hide(money(row.avgLoss)) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  {row.profitFactor === null
                    ? row.wins > 0
                      ? '∞'
                      : '—'
                    : row.profitFactor.toLocaleString('it-IT', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
