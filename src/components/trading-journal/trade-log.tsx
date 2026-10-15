'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import type { Trade } from '@/lib/types/trade';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

const net = (trade: Trade) => trade.pnl - trade.commission;

const dateOf = (trade: Trade) => {
  const date = new Date(trade.exitDate || trade.entryDate);

  return Number.isNaN(date.getTime()) ? null : date;
};

const timeOf = (trade: Trade) =>
  (trade.exitDate?.split('T')[1] || trade.entryDate?.split('T')[1] || '').slice(0, 5) || '—';

const money = (value: number) =>
  `${value > 0 ? '+' : ''}${value.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;

interface TradeLogProps {
  trades: Trade[];
  onOpenTrade: (trade: Trade) => void;
}

/** Latest trades first, ten at a time, for the dashboard. */
export function TradeLog({ trades, onOpenTrade }: TradeLogProps) {
  const { streamerMode } = useStreamerMode();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sorted = useMemo(
    () =>
      [...trades].sort(
        (a, b) => (dateOf(b)?.getTime() ?? 0) - (dateOf(a)?.getTime() ?? 0)
      ),
    [trades]
  );
  const shown = sorted.slice(0, visible);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <h2 className="font-sans text-[15px] font-semibold tracking-tight">Trade log</h2>
        <span className="font-sans text-xs tabular-nums text-muted-foreground">
          {trades.length} trade
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-10 text-center font-sans text-sm text-muted-foreground">
          Nessuna operazione da mostrare.
        </p>
      ) : (
        <>
          <div className="ej-scrollbar overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse font-sans text-xs tabular-nums">
              <thead>
                <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium sm:px-5">Data</th>
                  <th className="px-3 py-2.5 font-medium">Orario</th>
                  <th className="px-3 py-2.5 font-medium">Asset</th>
                  <th className="px-3 py-2.5 font-medium">Direzione</th>
                  <th className="px-3 py-2.5 font-medium">Setup</th>
                  <th className="px-3 py-2.5 text-center font-medium">P&L</th>
                  <th className="px-3 py-2.5 text-center font-medium">Note</th>
                  <th className="px-4 py-2.5 text-right font-medium sm:px-5" />
                </tr>
              </thead>
              <tbody>
                {shown.map(trade => {
                  const date = dateOf(trade);
                  const pnl = net(trade);

                  return (
                    <tr
                      key={trade.id}
                      className="border-b border-border/60 last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3 text-foreground sm:px-5">
                        {date
                          ? date.toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{timeOf(trade)}</td>
                      <td className="px-3 py-3 text-foreground">{trade.pair?.trim() || '—'}</td>
                      <td className="px-3 py-3 capitalize text-muted-foreground">
                        {trade.direction || '—'}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-3 text-muted-foreground">
                        {trade.strategy?.trim() || '—'}
                      </td>
                      <td
                        className={cn(
                          'whitespace-nowrap px-3 py-3 text-center font-semibold',
                          pnl > 0 ? 'text-profit' : pnl < 0 ? 'text-loss' : 'text-foreground'
                        )}
                      >
                        {streamerMode ? '******' : money(pnl)}
                      </td>
                      <td className="px-3 py-3">
                        <div
                          className="mx-auto max-w-[340px] overflow-hidden text-center text-[11px] leading-[1.4] text-muted-foreground"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                          title={trade.notes?.trim() || undefined}
                        >
                          {trade.notes?.trim() || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right sm:px-5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-3 text-xs"
                          onClick={() => onOpenTrade(trade)}
                        >
                          Apri
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
            <span className="font-sans text-[11px] tabular-nums text-muted-foreground">
              Mostrati {shown.length} di {sorted.length}
            </span>
            {shown.length < sorted.length && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg px-3 text-xs"
                onClick={() => setVisible(count => count + PAGE_SIZE)}
              >
                Mostra altri
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
