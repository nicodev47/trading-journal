'use client';

import { useMemo } from 'react';
import { TradingCalendar } from '@/components/trading-journal/trading-calendar';
import type { AccountSim } from '@/lib/propfirm/engine';
import type { PropAccount } from '@/lib/propfirm/types';
import type { Trade } from '@/lib/types/trade';
import { cn } from '@/lib/utils';
import { BalanceChart } from './balance-chart';
import { TargetTrack, formatDate, useMoney } from './shared';

function Stat({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: 'profit' | 'loss';
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background/40 p-3.5">
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-2 truncate font-sans text-lg font-semibold tabular-nums tracking-tight',
          tone === 'profit' && 'text-profit',
          tone === 'loss' && 'text-loss'
        )}
      >
        {children}
      </p>
    </div>
  );
}

interface HistoryRow {
  date: string;
  times: string;
  assets: string;
  pnl: number;
  count: number;
  winRate: number;
}

const dayOf = (trade: Trade) => (trade.exitDate || trade.entryDate || '').split('T')[0];

function buildHistory(trades: Trade[]): HistoryRow[] {
  const byDay = new Map<string, Trade[]>();

  trades.forEach(trade => byDay.set(dayOf(trade), [...(byDay.get(dayOf(trade)) ?? []), trade]));

  return Array.from(byDay.entries())
    .map(([date, list]) => {
      const nets = list.map(trade => trade.pnl - (trade.commission || 0));
      const wins = nets.filter(value => value > 0);
      const losses = nets.filter(value => value < 0);
      const times = Array.from(
        new Set(
          list
            .map(trade => (trade.exitDate || trade.entryDate || '').split('T')[1]?.slice(0, 5) ?? '')
            .filter(time => time && time !== '00:00')
        )
      ).sort();

      return {
        date,
        times: times.join(', ') || '—',
        assets: Array.from(new Set(list.map(trade => trade.pair?.trim()).filter(Boolean))).join(', ') || '—',
        pnl: nets.reduce((a, b) => a + b, 0),
        count: list.length,
        winRate: (wins.length / list.length) * 100,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Account screen: key numbers, balance chart, progress to the target (evaluation), calendar and history. */
export function AccountOverview({
  account,
  sim,
  trades,
}: {
  account: PropAccount;
  sim: AccountSim;
  trades: Trade[];
}) {
  const money = useMoney();
  const history = useMemo(() => buildHistory(trades), [trades]);
  const drawdownAmount = account.rules.drawdown.amount ?? 0;
  const targetBalance = sim.requiredProfit !== null ? account.size + sim.requiredProfit : null;
  const consistency = sim.consistency;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Saldo conto">{money.usd(sim.balance)}</Stat>
        <Stat label="Saldo minimo">{money.usd(sim.floor)}</Stat>
        <Stat label="P&L totale" tone={sim.profit > 0 ? 'profit' : sim.profit < 0 ? 'loss' : undefined}>
          {money.signed(sim.profit)}
        </Stat>
        <Stat label="Giorni di trading">{sim.tradingDays}</Stat>
        {account.kind === 'evaluation' ? (
          <Stat
            label={consistency ? `Consistenza (${Math.round(consistency.limit * 100)}%)` : 'Consistenza'}
            tone={consistency ? (consistency.ok ? 'profit' : 'loss') : undefined}
          >
            {consistency ? (consistency.share === null ? '—' : `${(consistency.share * 100).toFixed(2)}%`) : 'Nessuna'}
          </Stat>
        ) : (
          <Stat label="Minimo giornaliero">
            {account.rules.payout.winningDayMin > 0 ? money.usd(account.rules.payout.winningDayMin) : '—'}
          </Stat>
        )}
      </div>

      <BalanceChart sim={sim} size={account.size} drawdownAmount={drawdownAmount} targetBalance={targetBalance} />

      {targetBalance !== null && (
        <div className="rounded-xl border border-border bg-background/30 px-4 pb-4 pt-2">
          <TargetTrack floor={sim.floor} start={account.size} balance={sim.balance} target={targetBalance} />
          <div className="mt-1 flex items-start justify-between">
            <div>
              <p className="font-sans text-sm font-bold tabular-nums text-loss">{money.usd(sim.floor)}</p>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-loss/50">Limite</p>
            </div>
            <div className="text-right">
              <p className="font-sans text-sm font-bold tabular-nums text-profit">{money.usd(targetBalance)}</p>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-profit/50">Obiettivo</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/60 pt-4 text-center">
            <div>
              <p className="font-sans text-base font-semibold tabular-nums">{money.usd(drawdownAmount)}</p>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Drawdown</p>
            </div>
            <div>
              <p className="font-sans text-base font-semibold tabular-nums text-profit">{money.usd(sim.balance)}</p>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saldo</p>
            </div>
            <div>
              <p className="font-sans text-base font-semibold tabular-nums">{money.usd(sim.profitToGo ?? 0)}</p>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mancano</p>
            </div>
          </div>
        </div>
      )}

      <div id="prop-section-calendar" className="scroll-mt-14">
        <TradingCalendar
          readOnly
          hideActions
          trades={trades}
          weeklyPlans={[]}
          activeWorkspace="personal"
          onResetStudentJournal={() => {}}
          onDayClick={() => {}}
          onWeekPlanClick={() => {}}
          onImport={() => {}}
          onExport={() => {}}
        />
      </div>

      <div id="prop-section-history" className="scroll-mt-14 overflow-hidden rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-sans text-sm font-semibold">Storico trade</p>
          <p className="font-sans text-xs text-muted-foreground">{history.length} giorni</p>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
            Nessun trade assegnato a questo conto dal {formatDate(account.startDate)}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse font-sans text-sm tabular-nums">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Data</th>
                  <th className="px-3 py-2.5 font-semibold">Orario</th>
                  <th className="px-3 py-2.5 font-semibold">Asset</th>
                  <th className="px-3 py-2.5 text-right font-semibold">P&L netto</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Trade</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Win %</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => (
                  <tr key={row.date} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5">{formatDate(row.date)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.times}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.assets}</td>
                    <td
                      className={cn(
                        'px-3 py-2.5 text-right font-medium',
                        row.pnl > 0 ? 'text-profit' : row.pnl < 0 ? 'text-loss' : ''
                      )}
                    >
                      {money.signed(row.pnl)}
                    </td>
                    <td className="px-3 py-2.5 text-right">{row.count}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-xs font-semibold',
                          row.winRate >= 50 ? 'border-profit/40 bg-profit/10 text-profit' : 'border-loss/40 bg-loss/10 text-loss'
                        )}
                      >
                        {Math.round(row.winRate)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
