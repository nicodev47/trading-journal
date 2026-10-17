'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { fundedRulesFor, liveRulesFor } from '@/lib/propfirm/firms';
import type { PropAccount, PropRules } from '@/lib/propfirm/types';
import { FirmMark, formatDate, nextDay, todayKey, useMoney } from './shared';
import { getFirm } from '@/lib/propfirm/firms';

interface PromoteDialogProps {
  account: PropAccount | null;
  /** Phase the account moves to; funded by default. */
  target?: 'funded' | 'live';
  passedOn: string | null;
  onClose: () => void;
  onConfirm: (options: { name: string; startDate: string }) => void;
}

const DRAWDOWN: Record<PropRules['drawdown']['type'], string> = {
  'eod-trailing': 'a fine giornata',
  'intraday-trailing': 'intraday',
  static: 'fisso',
};

const suggestName = (name: string, target: 'funded' | 'live' = 'funded') => {
  const word = target === 'live' ? 'Live' : 'Funded';

  return /eval|funded/i.test(name) ? name.replace(/eval|funded/i, word) : `${name} · ${word}`;
};

/** Step from a passed evaluation to the funded account: what changes, then confirm. */
export function PromoteDialog({ account, target = 'funded', passedOn, onClose, onConfirm }: PromoteDialogProps) {
  const money = useMoney();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayKey());

  useEffect(() => {
    if (!account) return;

    setName(suggestName(account.name, target));
    setStartDate(target === 'live' ? todayKey() : nextDay(passedOn ?? todayKey()));
  }, [account, passedOn, target]);

  if (!account) return null;

  const before = account.rules;
  const live = target === 'live';
  const after = live ? liveRulesFor(account) : fundedRulesFor(account);
  const firm = getFirm(account.firmId);
  const usd = (value: number | null | undefined) => (value == null ? '—' : money.usd(value));
  const rows: [string, string, string][] = [
    ...(live ? [] : ([['Obiettivo di profitto', usd(before.profitTarget), 'Nessuno']] as [string, string, string][])),
    ...(live ? ([['Saldo iniziale', usd(account.size), usd(after.startBalance ?? account.size)]] as [string, string, string][]) : []),
    [
      'Max drawdown',
      `${usd(before.drawdown.amount)} · ${DRAWDOWN[before.drawdown.type]}`,
      `${usd(after.drawdown.amount)} · ${DRAWDOWN[after.drawdown.type]}`,
    ],
    [
      'Limite giornaliero',
      before.dailyLossLimit ? usd(before.dailyLossLimit.amount) : 'Nessuno',
      after.dailyLossLimit ? usd(after.dailyLossLimit.amount) : 'Nessuno',
    ],
    [
      'Consistenza',
      before.consistency && before.consistency.appliesTo !== 'funded'
        ? `${Math.round(before.consistency.maxDayShare * 100)}%`
        : live && before.consistency
          ? `${Math.round(before.consistency.maxDayShare * 100)}% sui payout`
          : 'Nessuna',
      after.consistency && after.consistency.appliesTo !== 'evaluation'
        ? `${Math.round(after.consistency.maxDayShare * 100)}% sui payout`
        : 'Nessuna',
    ],
    ['Split sui profitti', live ? `${Math.round(before.payout.split * 100)}/${Math.round((1 - before.payout.split) * 100)}` : '—', `${Math.round(after.payout.split * 100)}/${Math.round((1 - after.payout.split) * 100)}`],
    [
      'Per il payout',
      live
        ? [
            before.payout.minWinningDays > 0
              ? `${before.payout.minWinningDays} giorni da +${usd(before.payout.winningDayMin)}`
              : null,
            before.payout.buffer > 0 ? `buffer ${usd(before.payout.buffer)}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Nessun requisito'
        : '—',
      [
        after.payout.minWinningDays > 0
          ? `${after.payout.minWinningDays} giorni da +${usd(after.payout.winningDayMin)}`
          : null,
        after.payout.buffer > 0 ? `buffer ${usd(after.payout.buffer)}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Nessun requisito',
    ],
  ];

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-xl gap-0 overflow-y-auto rounded-2xl p-0 sm:w-[92vw]">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            {firm && <FirmMark firm={firm} className="size-10" />}
            <div>
              <DialogTitle className="font-sans text-base font-semibold">Passa a {live ? 'Live' : 'Funded'}</DialogTitle>
              <DialogDescription className="mt-0.5 flex items-center gap-1.5 font-sans text-xs text-profit">
                <Check className="size-3.5" />
                {live ? 'Passaggio manuale alla fase Live' : `Obiettivo raggiunto${passedOn ? ` il ${formatDate(passedOn)}` : ''}`}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[1.1fr_1fr_1fr] bg-white/[0.03] px-3 py-2 font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span />
              <span>{live ? 'Funded' : 'Evaluation'}</span>
              <span>{live ? 'Live' : 'Funded'}</span>
            </div>
            {rows.map(([label, from, to]) => (
              <div
                key={label}
                className="grid grid-cols-[1.1fr_1fr_1fr] gap-2 border-t border-border/60 px-3 py-2.5 font-sans text-xs"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="tabular-nums">{from}</span>
                <span className="font-semibold tabular-nums">{to}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Nome del conto {live ? 'live' : 'funded'}
              </span>
              <Input value={name} onChange={event => setName(event.target.value)} className="h-10" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Inizia il
              </span>
              <Input
                type="date"
                value={startDate}
                onChange={event => setStartDate(event.target.value || todayKey())}
                className="ej-date-input-no-indicator h-10"
              />
            </label>
          </div>

          <p className="font-sans text-[11px] leading-relaxed text-muted-foreground">
            {live
              ? 'Il conto live riparte da 0: i trade assegnati o collegati al journal contano dalla data di inizio. Il conto funded viene tolto dall’elenco. Dove la firm non pubblica una regola live resta quella del funded.'
              : `Il conto funded riparte da ${money.usd(account.size)}: i trade assegnati o collegati al journal contano dalla data di inizio. L’evaluation superata viene tolta dall’elenco.`}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
          <Button type="button" variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button
            type="button"
            className="bg-profit px-5 font-semibold text-black hover:bg-profit/90"
            onClick={() => onConfirm({ name: name.trim() || suggestName(account.name), startDate })}
          >
            Passa a {live ? 'Live' : 'Funded'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
