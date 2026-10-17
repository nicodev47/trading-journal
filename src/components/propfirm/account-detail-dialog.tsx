'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import type { AccountSim } from '@/lib/propfirm/engine';
import { getFirm } from '@/lib/propfirm/firms';
import { RulesEditor } from './rules-editor';
import { AccountOverview } from './account-overview';
import type { DayResult, Payout, PropAccount, PropRules } from '@/lib/propfirm/types';
import type { Trade } from '@/lib/types/trade';
import { cn } from '@/lib/utils';
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
  /** Trades that count for this account. */
  trades: Trade[];
  journalName: string | null;
  onClose: () => void;
  onUpdate: (patch: Partial<PropAccount>) => void;
  onDelete: () => void;
  onAddPayout: (payout: Omit<Payout, 'id'>) => void;
  onRemovePayout: (payoutId: string) => void;
  /** Starts the next phase (funded after a passed evaluation) as a new account. */
  onStartFunded: () => void;
  onReset: () => void;
  /** Section to scroll to when the dialog opens (e.g. 'payout'). */
  initialSection?: string;
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
  trades,
  journalName,
  onClose,
  onUpdate,
  onDelete,
  onAddPayout,
  onRemovePayout,
  onStartFunded,
  onReset,
  initialSection,
}: AccountDetailDialogProps) {
  const money = useMoney();
  const { streamerMode } = useStreamerMode();
  const isEvaluation = account.kind === 'evaluation';
  const rules = account.rules;
  const firm = getFirm(account.firmId);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(account.name);
  const [balanceDate, setBalanceDate] = useState(todayKey());
  const [balanceValue, setBalanceValue] = useState('');
  // A payout covers every trade registered so far, including days dated after today.
  const [payoutDate, setPayoutDate] = useState(() =>
    days.reduce((latest, day) => (day.date > latest ? day.date : latest), todayKey())
  );
  const [payoutAmount, setPayoutAmount] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const drawdownAmount = rules.drawdown.amount ?? 0;
  const paidNet = account.payouts.reduce((total, payout) => total + payout.gross * rules.payout.split, 0);

  useEffect(() => {
    if (!initialSection) return;

    const timer = window.setTimeout(
      () =>
        document
          .getElementById(`prop-section-${initialSection}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      350
    );

    return () => window.clearTimeout(timer);
  }, [initialSection]);

  const winningDays = sim.days.filter(row => row.pnl > 0).length;
  const bestDay = sim.days.reduce((best, row) => Math.max(best, row.pnl), 0);
  const worstDay = sim.days.reduce((worst, row) => Math.min(worst, row.pnl), 0);
  const targetBalance =
    isEvaluation && sim.requiredProfit !== null ? account.size + sim.requiredProfit : null;
  // The payout area only exists while a payout can be requested (or there are payouts to look at).
  const showPayoutSection =
    !isEvaluation && Boolean(sim.payout?.eligible || account.payouts.length > 0);

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

  // A payout can never exceed what the rules allow; an empty field means "all of it".
  const availablePayout = sim.payout?.available ?? 0;
  const typedPayout = payoutAmount.trim() === '' ? availablePayout : Number(payoutAmount.replace(',', '.'));
  const payoutIssue = !Number.isFinite(typedPayout) || typedPayout <= 0
    ? 'Scrivi un importo valido.'
    : typedPayout > availablePayout + 0.005
      ? `Puoi richiedere al massimo ${money.usd(availablePayout)}.`
      : typedPayout < rules.payout.minRequest
        ? `Il payout minimo è ${money.usd(rules.payout.minRequest)}.`
        : null;

  const addPayout = () => {
    if (payoutIssue) return;

    onAddPayout({ date: payoutDate, gross: typedPayout });
    setPayoutAmount('');
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
            {sim.status === 'passed' && isEvaluation && account.promotedTo ? (
              <span className="font-sans text-xs text-muted-foreground">Già passato a Funded</span>
            ) : sim.status === 'passed' && isEvaluation ? (
              <Button type="button" size="sm" className="bg-white text-black hover:bg-white/90" onClick={onStartFunded}>
                Passa a Funded
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
              ['calendar', 'Calendario'],
              ['history', 'Storico'],
              ...(account.firmId === 'custom' ? [['rules', 'Regole']] : []),
              ...(showPayoutSection ? [['payout', 'Payout']] : []),
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

            <AccountOverview account={account} sim={sim} trades={trades} />

            {sim.approximate && (
              <p className="font-sans text-xs text-muted-foreground">
                Il drawdown intraday segue anche i profitti non chiusi: qui è approssimato con i saldi a fine giornata.
              </p>
            )}
          </section>

          {account.firmId === 'custom' && (
            <section id="prop-section-rules" className="scroll-mt-14 flex flex-col gap-4 p-4 sm:p-6">
              <h3 className="font-sans text-lg font-semibold tracking-tight">Le tue regole</h3>
              <div className="rounded-xl border border-border bg-background/30 p-4">
                <RulesEditor
                  rules={rules}
                  isEvaluation={isEvaluation}
                  onChange={(next: PropRules) => onUpdate({ rules: next })}
                />
              </div>
            </section>
          )}

          {showPayoutSection && sim.payout && (
            <section id="prop-section-payout" className="scroll-mt-14 flex flex-col gap-4 p-4 sm:p-6">
            <h3 className="font-sans text-lg font-semibold tracking-tight">Payout</h3>
              {sim.payout.eligible && (
                <>
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
                <Button type="button" size="sm" className="h-9" disabled={Boolean(payoutIssue)} onClick={addPayout}>
                  Registra payout
                </Button>
              </div>

              {payoutIssue && payoutAmount.trim() !== '' && (
                <p className="font-sans text-xs text-loss">{payoutIssue}</p>
              )}
                </>
              )}

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
          <section className="p-4 sm:p-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
