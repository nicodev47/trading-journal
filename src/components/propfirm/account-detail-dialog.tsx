'use client';

import { useMemo, useState } from 'react';
import { Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { previewNextDay, type AccountSim } from '@/lib/propfirm/engine';
import { getFirm, isIncomplete } from '@/lib/propfirm/firms';
import type { DayResult, Payout, PropAccount, PropRules } from '@/lib/propfirm/types';
import { cn } from '@/lib/utils';
import { RulesEditor } from './rules-editor';
import {
  FAIL_LABEL,
  FirmMark,
  KIND_LABEL,
  ProgressBar,
  StatusBadge,
  formatDate,
  todayKey,
  useMoney,
} from './shared';

interface AccountDetailDialogProps {
  account: PropAccount;
  sim: AccountSim;
  days: DayResult[];
  journalName: string | null;
  onClose: () => void;
  onUpdate: (patch: Partial<PropAccount>) => void;
  onDelete: () => void;
  onAddPayout: (payout: Omit<Payout, 'id'>) => void;
  onRemovePayout: (payoutId: string) => void;
  /** Starts the next phase (funded after a passed evaluation) as a new account. */
  onStartFunded: () => void;
  onReset: () => void;
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: 'profit' | 'loss' }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3.5">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1.5 font-sans text-xl font-semibold tabular-nums tracking-tight',
          tone === 'profit' && 'text-profit',
          tone === 'loss' && 'text-loss'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ProgressRow({
  title,
  hint,
  value,
  percent,
  tone,
}: {
  title: string;
  hint?: string;
  value: string;
  percent: number;
  tone?: 'neutral' | 'profit' | 'loss';
}) {
  return (
    <div className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[1fr_1.2fr] sm:items-center sm:gap-6">
      <div>
        <p className="font-sans text-sm font-semibold">{title}</p>
        {hint && <p className="font-sans text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-right font-sans text-sm font-semibold tabular-nums">{value}</p>
        <ProgressBar value={percent} tone={tone} />
      </div>
    </div>
  );
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

export function AccountDetailDialog({
  account,
  sim,
  days,
  journalName,
  onClose,
  onUpdate,
  onDelete,
  onAddPayout,
  onRemovePayout,
  onStartFunded,
  onReset,
}: AccountDetailDialogProps) {
  const money = useMoney();
  const isEvaluation = account.kind === 'evaluation';
  const rules = account.rules;
  const firm = getFirm(account.firmId);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(account.name);
  const [balanceDate, setBalanceDate] = useState(todayKey());
  const [balanceValue, setBalanceValue] = useState('');
  const [payoutDate, setPayoutDate] = useState(todayKey());
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tomorrow, setTomorrow] = useState(0);

  const drawdownAmount = rules.drawdown.amount ?? 0;
  const paidNet = account.payouts.reduce((total, payout) => total + payout.gross * rules.payout.split, 0);
  const input = useMemo(
    () => ({
      kind: account.kind,
      size: account.size,
      rules,
      days,
      payouts: account.payouts.filter(payout => payout.date >= account.startDate),
    }),
    [account.kind, account.size, account.startDate, rules, days, account.payouts]
  );
  const preview = useMemo(() => previewNextDay(input, tomorrow), [input, tomorrow]);
  const sliderMax = Math.max(drawdownAmount, rules.profitTarget ?? 0, 1000);

  const saveName = () => {
    const next = nameDraft.trim();

    if (next) onUpdate({ name: next });

    setEditingName(false);
  };

  const addBalance = () => {
    const parsed = Number(balanceValue.replace(',', '.'));

    if (!Number.isFinite(parsed) || balanceValue.trim() === '') return;

    onUpdate({
      balanceUpdates: [
        ...account.balanceUpdates.filter(update => update.date !== balanceDate),
        { date: balanceDate, balance: parsed },
      ],
    });
    setBalanceValue('');
  };

  const addPayout = () => {
    const parsed = Number(payoutAmount.replace(',', '.'));

    if (!Number.isFinite(parsed) || parsed <= 0) return;

    onAddPayout({ date: payoutDate, gross: parsed, note: payoutNote.trim() || undefined });
    setPayoutAmount('');
    setPayoutNote('');
  };

  const roomPercent = drawdownAmount > 0 ? (sim.room / drawdownAmount) * 100 : 100;
  const targetPercent =
    sim.requiredProfit && sim.requiredProfit > 0 ? (Math.max(0, sim.profit) / sim.requiredProfit) * 100 : 0;
  const share = sim.consistency?.share ?? 0;

  const ruleRows: [string, string][] = [
    ['Obiettivo di profitto', isEvaluation ? (rules.profitTarget === null ? '—' : money.usd(rules.profitTarget)) : 'Nessuno'],
    [
      'Max drawdown',
      rules.drawdown.amount === null
        ? '—'
        : `${money.usd(rules.drawdown.amount)} · ${
            rules.drawdown.type === 'static'
              ? 'fisso'
              : rules.drawdown.type === 'intraday-trailing'
                ? 'trailing intraday (approssimato)'
                : 'trailing a fine giornata'
          }`,
    ],
    [
      'Limite giornaliero',
      rules.dailyLossLimit
        ? `${money.usd(rules.dailyLossLimit.amount)} · ${rules.dailyLossLimit.effect === 'breach' ? 'violazione' : 'blocca il giorno'}`
        : 'Nessuno',
    ],
    [
      'Consistenza',
      rules.consistency
        ? `${percent(rules.consistency.maxDayShare)} · ${
            rules.consistency.appliesTo === 'evaluation'
              ? 'valutazione'
              : rules.consistency.appliesTo === 'funded'
                ? 'funded e live'
                : 'sempre'
          }`
        : 'Nessuna',
    ],
    ['Giorni minimi', rules.minTradingDays > 0 ? String(rules.minTradingDays) : 'Nessuno'],
    ['Contratti massimi', rules.maxContracts ?? '—'],
    ['Split sui profitti', `${Math.round(rules.payout.split * 100)}/${Math.round((1 - rules.payout.split) * 100)}`],
  ];

  return (
    <Dialog open onOpenChange={next => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="ej-scrollbar max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-3xl gap-0 overflow-y-auto rounded-2xl border-border bg-card p-0 sm:w-[92vw]"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <DialogTitle className="sr-only">{account.name}</DialogTitle>
        <DialogDescription className="sr-only">Dettaglio del conto simulato.</DialogDescription>

        <div className="relative border-b border-border bg-gradient-to-b from-white/[0.07] to-transparent px-4 pb-4 pt-5 sm:px-6">
          <button
            type="button"
            aria-label="Chiudi"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-muted-foreground hover:bg-white/20 hover:text-foreground"
          >
            <X className="size-4" />
          </button>

          <div className="flex flex-wrap items-center gap-4 pr-10">
            {firm && <FirmMark firm={firm} className="size-14" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {editingName ? (
                  <Input
                    autoFocus
                    value={nameDraft}
                    maxLength={40}
                    className="h-9 w-56 text-base font-semibold"
                    onChange={event => setNameDraft(event.target.value)}
                    onBlur={saveName}
                    onKeyDown={event => {
                      if (event.key === 'Enter') saveName();
                      if (event.key === 'Escape') {
                        event.stopPropagation();
                        setNameDraft(account.name);
                        setEditingName(false);
                      }
                    }}
                  />
                ) : (
                  <>
                    <h2 className="font-sans text-xl font-semibold tracking-tight">{account.name}</h2>
                    <button
                      type="button"
                      aria-label="Rinomina il conto"
                      onClick={() => {
                        setNameDraft(account.name);
                        setEditingName(true);
                      }}
                      className="rounded-md p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </>
                )}
                <span className="rounded-full border border-border bg-white/[0.06] px-2 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
                  {KIND_LABEL[account.kind]}
                </span>
                <StatusBadge status={sim.status} />
              </div>
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                {account.firmName} · {account.ruleSetName} {account.sizeLabel} · {money.usd(account.size)} ·{' '}
                {account.source.kind === 'journal' ? `collegato a ${journalName ?? 'un journal non trovato'}` : 'aggiornamento manuale'}
              </p>
            </div>
          </div>
        </div>

        {sim.status !== 'active' && (
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6',
              sim.status === 'passed' ? 'border-profit/30 bg-profit/10' : 'border-loss/30 bg-loss/10'
            )}
          >
            <p className="font-sans text-sm">
              {sim.status === 'passed' ? (
                <>
                  <strong className="text-profit">Valutazione superata</strong> il {formatDate(sim.endedOn ?? '')}.
                </>
              ) : (
                <>
                  <strong className="text-loss">Conto fallito</strong> il {formatDate(sim.endedOn ?? '')}:{' '}
                  {sim.failReason ? FAIL_LABEL[sim.failReason] : ''}.
                </>
              )}
            </p>
            {sim.status === 'passed' && isEvaluation ? (
              <Button type="button" size="sm" className="bg-[#0a84ff] text-white hover:bg-[#0a84ff]/90" onClick={onStartFunded}>
                Avvia il conto funded
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={onReset}>
                Riparti da capo
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-col">
          <nav className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
            {[
              ['overview', 'Panoramica'],
              ['rules', 'Regole'],
              ['consistency', 'Consistenza'],
              ['days', 'Giorni'],
              ...(isEvaluation ? [] : [['payout', 'Payout']]),
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  document.getElementById(`prop-section-${value}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="h-8 flex-none rounded-full border border-border px-4 text-xs transition-colors hover:bg-white hover:text-black"
              >
                {label}
              </button>
            ))}
          </nav>

          <section id="prop-section-overview" className="scroll-mt-14 flex flex-col gap-4 p-4 sm:p-6">
            <h3 className="font-sans text-lg font-semibold tracking-tight">Panoramica</h3>
            {account.source.kind === 'manual' && (
              <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-background/40 p-3">
                <label className="flex flex-col gap-1">
                  <span className="font-sans text-[11px] text-muted-foreground">Data</span>
                  <Input
                    type="date"
                    value={balanceDate}
                    onChange={event => setBalanceDate(event.target.value || todayKey())}
                    className="ej-date-input-no-indicator h-9 w-40"
                  />
                </label>
                <label className="flex min-w-32 flex-1 flex-col gap-1">
                  <span className="font-sans text-[11px] text-muted-foreground">Saldo letto dalla piattaforma</span>
                  <Input
                    inputMode="decimal"
                    value={balanceValue}
                    placeholder={String(sim.balance)}
                    onChange={event => setBalanceValue(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && addBalance()}
                    className="h-9"
                  />
                </label>
                <Button type="button" size="sm" className="h-9 gap-2" onClick={addBalance}>
                  <RefreshCw className="size-3.5" />
                  Aggiorna saldo
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Tile label="Saldo" value={money.usd(sim.balance)} />
              <Tile
                label="P&L"
                value={money.signed(sim.profit)}
                tone={sim.profit > 0 ? 'profit' : sim.profit < 0 ? 'loss' : undefined}
              />
              <Tile
                label="Margine prima della violazione"
                value={money.usd(sim.room)}
                tone={sim.room <= drawdownAmount * 0.25 ? 'loss' : undefined}
              />
            </div>

            <div className="divide-y divide-border/60 rounded-xl border border-border bg-background/30 px-4">
              {sim.consistency && (
                <ProgressRow
                  title="Consistenza"
                  hint="Il tuo giorno migliore rispetto al profitto"
                  value={sim.consistency.share === null ? `— di ${percent(sim.consistency.limit)}` : `${percent(share)} di ${percent(sim.consistency.limit)}`}
                  percent={sim.consistency.limit > 0 ? (share / sim.consistency.limit) * 100 : 0}
                  tone={sim.consistency.ok ? 'neutral' : 'loss'}
                />
              )}
              <ProgressRow
                title="Margine prima della violazione"
                hint={`Il floor è a ${money.usd(sim.floor)}`}
                value={money.usd(sim.room)}
                percent={roomPercent}
                tone={roomPercent <= 25 ? 'loss' : 'neutral'}
              />
              {isEvaluation && (
                <ProgressRow
                  title="Obiettivo di profitto"
                  hint={
                    sim.profitToGo === null
                      ? 'Obiettivo non impostato'
                      : sim.profitToGo === 0
                        ? 'Raggiunto'
                        : `Ne mancano ${money.usd(sim.profitToGo)}`
                  }
                  value={
                    sim.requiredProfit === null
                      ? '—'
                      : `${money.usd(Math.max(0, sim.profit))} di ${money.usd(sim.requiredProfit)}`
                  }
                  percent={targetPercent}
                  tone="profit"
                />
              )}
              {!isEvaluation && sim.payout && (
                <ProgressRow
                  title="Payout disponibile"
                  hint={`${sim.payout.winningDays} di ${rules.payout.minWinningDays} giorni vincenti`}
                  value={money.usd(sim.payout.available)}
                  percent={
                    rules.payout.minWinningDays > 0
                      ? (sim.payout.winningDays / rules.payout.minWinningDays) * 100
                      : sim.payout.available > 0
                        ? 100
                        : 0
                  }
                  tone="profit"
                />
              )}
            </div>

            {sim.approximate && (
              <p className="font-sans text-xs text-muted-foreground">
                Il drawdown intraday segue anche i profitti non chiusi: qui è approssimato con i saldi a fine giornata.
              </p>
            )}
          </section>

          <section id="prop-section-rules" className="scroll-mt-14 flex flex-col gap-5 p-4 sm:p-6">
            <h3 className="font-sans text-lg font-semibold tracking-tight">Regole</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Obiettivo" value={isEvaluation ? (rules.profitTarget === null ? '—' : money.usd(rules.profitTarget)) : '—'} />
              <Tile label="Max drawdown" value={rules.drawdown.amount === null ? '—' : money.usd(rules.drawdown.amount)} />
              <Tile label="Perdita giornaliera" value={rules.dailyLossLimit ? money.usd(rules.dailyLossLimit.amount) : 'Nessun limite'} />
              <Tile label="Giorni operativi" value={String(sim.tradingDays)} />
            </div>

            <div className="rounded-xl border border-border bg-background/30 p-4">
              <p className="mb-3 font-sans text-sm font-semibold">
                Regole {account.ruleSetName} {account.sizeLabel}
              </p>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
                {ruleRows.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-border/50 pb-2 font-sans text-sm">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              {isIncomplete(rules, account.kind) && (
                <p className="mt-3 rounded-lg border border-[#ff9f0a]/40 bg-[#ff9f0a]/10 px-3 py-2 font-sans text-xs text-[#ffb340]">
                  Mancano alcuni numeri del piano: completali qui sotto.
                </p>
              )}
              <p className="mt-3 font-sans text-[11px] leading-relaxed text-muted-foreground">{account.templateNote}</p>
            </div>

            <div className="rounded-xl border border-border bg-background/30 p-4">
              <p className="mb-3 font-sans text-sm font-semibold">Modifica le regole</p>
              <RulesEditor
                rules={rules}
                isEvaluation={isEvaluation}
                onChange={(next: PropRules) => onUpdate({ rules: next })}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-loss/30 bg-loss/5 p-4">
              <p className="font-sans text-xs text-muted-foreground">
                Eliminare il conto non tocca i tuoi journal.
              </p>
              {confirmDelete ? (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                    Annulla
                  </Button>
                  <Button type="button" size="sm" className="bg-loss text-white hover:bg-loss/90" onClick={onDelete}>
                    Elimina davvero
                  </Button>
                </div>
              ) : (
                <Button type="button" size="sm" variant="outline" className="gap-2 text-loss" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-3.5" />
                  Elimina conto
                </Button>
              )}
            </div>
          </section>

          <section id="prop-section-consistency" className="scroll-mt-14 flex flex-col gap-4 p-4 sm:p-6">
            <h3 className="font-sans text-lg font-semibold tracking-tight">Consistenza</h3>
            {!sim.consistency ? (
              <p className="py-10 text-center font-sans text-sm text-muted-foreground">
                {rules.consistency
                  ? `La regola di consistenza di questo piano non vale per un conto ${KIND_LABEL[account.kind].toLowerCase()}.`
                  : 'Questo piano non ha una regola di consistenza.'}
              </p>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-background/30 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-sans text-sm font-semibold">Regola di consistenza</p>
                    <p className="font-sans text-sm font-semibold tabular-nums">
                      Limite {percent(sim.consistency.limit)}
                    </p>
                  </div>
                  <p className="mt-2 font-sans text-2xl font-semibold tabular-nums">
                    {sim.consistency.share === null ? '—' : percent(sim.consistency.share)}
                  </p>
                  <div className="relative mt-2">
                    <ProgressBar
                      value={share * 100}
                      tone={sim.consistency.ok ? 'neutral' : 'loss'}
                    />
                    <span
                      className="absolute -top-1 h-3.5 w-px bg-white"
                      style={{ left: `${Math.min(100, sim.consistency.limit * 100)}%` }}
                    />
                  </div>
                  <p className="mt-3 font-sans text-xs text-muted-foreground">
                    Il giorno migliore deve restare entro il {percent(sim.consistency.limit)} del profitto totale.
                    {isEvaluation &&
                      ' In valutazione, oltre il limite il conto non fallisce: l’obiettivo sale finché il giorno migliore rientra nel limite.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Tile label="Giorno migliore" value={sim.consistency.bestDay > 0 ? money.usd(sim.consistency.bestDay) : '—'} />
                  <Tile label="Profitto conteggiato" value={money.usd(sim.consistency.profitCounted)} />
                  <Tile
                    label="Massimo domani"
                    value={sim.consistency.biggestNextDay === null ? '—' : money.usd(sim.consistency.biggestNextDay)}
                  />
                  <Tile
                    label="Per rientrare"
                    value={sim.consistency.profitToFix > 0 ? money.usd(sim.consistency.profitToFix) : 'Niente'}
                    tone={sim.consistency.profitToFix > 0 ? 'loss' : undefined}
                  />
                </div>

                <div className="rounded-xl border border-border bg-background/30 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-sans text-sm font-semibold">Se domani faccio</p>
                    <p className="font-sans text-sm font-semibold tabular-nums">{money.signed(tomorrow)}</p>
                  </div>
                  <input
                    type="range"
                    min={-drawdownAmount || -sliderMax}
                    max={sliderMax}
                    step={50}
                    value={tomorrow}
                    onChange={event => setTomorrow(Number(event.target.value))}
                    className="mt-3 w-full accent-[#0a84ff]"
                    aria-label="Risultato di domani"
                  />
                  <p className="mt-2 font-sans text-xs text-muted-foreground">
                    Dopo un altro giorno la consistenza sarebbe{' '}
                    <strong className={preview.consistency?.ok === false ? 'text-loss' : 'text-foreground'}>
                      {preview.consistency?.share == null ? '—' : percent(preview.consistency.share)}
                    </strong>{' '}
                    (limite {percent(sim.consistency.limit)}) e il margine{' '}
                    <strong className="text-foreground">{money.usd(preview.room)}</strong>
                    {preview.status === 'failed' && <strong className="text-loss"> — il conto fallirebbe.</strong>}
                    {preview.status === 'passed' && <strong className="text-profit"> — supereresti la valutazione.</strong>}
                  </p>
                </div>
              </>
            )}
          </section>

          <section id="prop-section-days" className="scroll-mt-14 p-4 sm:p-6">
            <h3 className="font-sans text-lg font-semibold tracking-tight">Giorni</h3>
            {sim.days.length === 0 ? (
              <p className="py-10 text-center font-sans text-sm text-muted-foreground">
                {account.source.kind === 'journal'
                  ? `Nessun trade nel journal dal ${formatDate(account.startDate)}.`
                  : 'Aggiorna il saldo per vedere i giorni.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[460px] border-collapse font-sans text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Giorno</th>
                      <th className="px-3 py-2.5 text-right font-medium">P&L</th>
                      <th className="px-3 py-2.5 text-right font-medium">Saldo</th>
                      <th className="px-4 py-2.5 text-right font-medium">Floor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sim.days].reverse().map(row => (
                      <tr key={row.date} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2.5">
                          {formatDate(row.date)}
                          {row.dayLocked && (
                            <span className="ml-2 rounded-full bg-loss/15 px-2 py-0.5 text-[10px] text-loss">limite giornaliero</span>
                          )}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right font-medium',
                            row.pnl > 0 ? 'text-profit' : row.pnl < 0 ? 'text-loss' : ''
                          )}
                        >
                          {money.signed(row.pnl)}
                        </td>
                        <td className="px-3 py-2.5 text-right">{money.usd(row.balance)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{money.usd(row.floor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {!isEvaluation && sim.payout && (
            <section id="prop-section-payout" className="scroll-mt-14 flex flex-col gap-4 p-4 sm:p-6">
            <h3 className="font-sans text-lg font-semibold tracking-tight">Payout</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Tile label="Incassato (netto)" value={money.usd(Math.round(paidNet * 100) / 100)} tone={paidNet > 0 ? 'profit' : undefined} />
                <Tile label="Payout disponibile" value={money.usd(sim.payout.available)} />
                <Tile label="Giorni vincenti" value={`${sim.payout.winningDays} / ${rules.payout.minWinningDays}`} />
              </div>

              <div
                className={cn(
                  'rounded-xl border p-4 font-sans text-sm',
                  sim.payout.eligible ? 'border-profit/30 bg-profit/10' : 'border-border bg-background/30'
                )}
              >
                {sim.payout.eligible ? (
                  <p>
                    Puoi richiedere un payout fino a <strong className="text-profit">{money.usd(sim.payout.available)}</strong>:
                    ti spettano <strong>{money.usd(sim.payout.available * rules.payout.split)}</strong> ({Math.round(rules.payout.split * 100)}%).
                  </p>
                ) : (
                  <>
                    <p className="font-semibold">Non ancora disponibile</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-muted-foreground">
                      {sim.payout.missing.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-background/40 p-3">
                <label className="flex flex-col gap-1">
                  <span className="font-sans text-[11px] text-muted-foreground">Data</span>
                  <Input
                    type="date"
                    value={payoutDate}
                    onChange={event => setPayoutDate(event.target.value || todayKey())}
                    className="ej-date-input-no-indicator h-9 w-40"
                  />
                </label>
                <label className="flex min-w-28 flex-1 flex-col gap-1">
                  <span className="font-sans text-[11px] text-muted-foreground">Importo lordo (USD)</span>
                  <Input
                    inputMode="decimal"
                    value={payoutAmount}
                    placeholder={sim.payout.available ? String(sim.payout.available) : '0'}
                    onChange={event => setPayoutAmount(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && addPayout()}
                    className="h-9"
                  />
                </label>
                <label className="flex min-w-28 flex-1 flex-col gap-1">
                  <span className="font-sans text-[11px] text-muted-foreground">Nota</span>
                  <Input
                    value={payoutNote}
                    onChange={event => setPayoutNote(event.target.value)}
                    className="h-9"
                    placeholder="Facoltativa"
                  />
                </label>
                <Button type="button" size="sm" className="h-9" onClick={addPayout}>
                  Registra payout
                </Button>
              </div>

              {account.payouts.length > 0 && (
                <ul className="divide-y divide-border/60 rounded-xl border border-border">
                  {[...account.payouts]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(payout => (
                      <li key={payout.id} className="flex items-center justify-between gap-3 px-4 py-3 font-sans text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold tabular-nums">
                            {money.usd(payout.gross)}{' '}
                            <span className="font-normal text-muted-foreground">
                              → {money.usd(payout.gross * rules.payout.split)} a te
                            </span>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatDate(payout.date)}
                            {payout.note ? ` · ${payout.note}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Elimina il payout"
                          onClick={() => onRemovePayout(payout.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-white/10 hover:text-loss"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
