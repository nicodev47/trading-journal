'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { usePropAccounts } from '@/hooks/use-prop-accounts';
import { getAccountDays, getAccountTrades, startBalanceOf } from '@/lib/propfirm/days';
import { simulateAccount } from '@/lib/propfirm/engine';
import { FIRMS, fundedRulesFor, getFirm, liveRulesFor } from '@/lib/propfirm/firms';
import type { PropAccount } from '@/lib/propfirm/types';
import type { Trade } from '@/lib/types/trade';
import { cn } from '@/lib/utils';
import { AccountDetailDialog } from './account-detail-dialog';
import { AddAccountDialog, type NewAccount } from './add-account-dialog';
import { PromoteDialog } from './promote-dialog';
import { RulesGuideDialog } from './rules-guide-dialog';
import {
  FirmFolder,
  FirmMark,
  KIND_LABEL,
  ProgressBar,
  StatusBadge,
  TargetTrack,
  nextDay,
  todayKey,
  useMoney,
} from './shared';

type Store = ReturnType<typeof usePropAccounts>;

interface PropfirmPageProps {
  store: Store;
  journals: { id: string; name: string }[];
  getJournalTrades: (journalId: string) => Trade[];
}

/** Simulation inputs: payouts made before the start date belong to an older run. */
const simulate = (account: PropAccount, getJournalTrades: (id: string) => Trade[]) => {
  const days = getAccountDays(account, getJournalTrades);

  return {
    days,
    sim: simulateAccount({
      kind: account.kind,
      size: account.size,
      rules: account.rules,
      days,
      payouts: account.payouts.filter(payout => payout.date >= account.startDate),
    }),
  };
};

const DRAWDOWN_LABEL = {
  'eod-trailing': 'EOD DRAWDOWN',
  'intraday-trailing': 'INTRADAY DRAWDOWN',
  static: 'STATIC DRAWDOWN',
} as const;

function Stat({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <div className="mt-1 font-sans text-base font-semibold tabular-nums tracking-tight">{children}</div>
      {hint && <p className="mt-0.5 font-sans text-[10px] font-medium text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Pill({ tone, children }: { tone: 'neutral' | 'blue' | 'amber' | 'green'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'rounded-md border px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider',
        tone === 'neutral' && 'border-border bg-white/[0.06] text-muted-foreground',
        tone === 'blue' && 'border-white/30 bg-white/10 text-foreground',
        tone === 'amber' && 'border-[#ff9f0a]/40 bg-[#ff9f0a]/10 text-[#ffb340]',
        tone === 'green' && 'border-profit/40 bg-profit/10 text-profit'
      )}
    >
      {children}
    </span>
  );
}

function AccountCard({
  account,
  getJournalTrades,
  onOpen,
  onReset,
  onPromote,
  onOpenAccount,
}: {
  account: PropAccount;
  getJournalTrades: (id: string) => Trade[];
  onOpen: (section?: string) => void;
  onReset: (endedOn: string | null) => void;
  onPromote: (endedOn: string | null) => void;
  onOpenAccount: (id: string) => void;
}) {
  const money = useMoney();
  const firm = getFirm(account.firmId);
  const { sim } = useMemo(() => simulate(account, getJournalTrades), [account, getJournalTrades]);
  const [confirmReset, setConfirmReset] = useState(false);
  const rules = account.rules;
  const isEvaluation = account.kind === 'evaluation';
  const targetBalance =
    isEvaluation && sim.requiredProfit !== null ? account.size + sim.requiredProfit : null;
  const consistency = sim.consistency;
  const payout = sim.payout;
  const daysReady = payout ? payout.winningDays >= rules.payout.minWinningDays : false;

  return (
    <div className={cn(
        'flex h-full flex-col gap-3.5 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-white/20',
        !isEvaluation && payout?.eligible && 'ej-payout-ready'
      )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {firm && <FirmMark firm={firm} className="size-8 text-xs" />}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-sans text-[13px] font-bold uppercase tracking-tight">
                {account.firmName} {account.sizeLabel}
              </p>
              <Pill tone="neutral">{isEvaluation ? 'EVAL' : KIND_LABEL[account.kind].toUpperCase()}</Pill>
            </div>
            <p className="mt-0.5 truncate font-sans text-[11px] tracking-wide text-muted-foreground">
              {account.ruleSetName} · {account.name}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="neutral">{DRAWDOWN_LABEL[rules.drawdown.type]}</Pill>
        <span
          className={cn(
            'rounded-md border px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider',
            sim.status === 'active' && 'border-profit/40 bg-profit/10 text-profit',
            sim.status === 'passed' && 'border-white/30 bg-white/10 text-foreground',
            sim.status === 'failed' && 'border-loss/40 bg-loss/10 text-loss'
          )}
        >
          {sim.status === 'active' ? 'Active' : sim.status === 'passed' ? 'Passed' : 'Failed'}
        </span>
        {rules.dailyLossLimit ? (
          <Pill tone="amber">DLL {money.usd(rules.dailyLossLimit.amount)}</Pill>
        ) : (
          <Pill tone="blue">No DLL</Pill>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4 border-t border-border pt-3.5">
        <Stat label="Saldo conto">
          <span>{money.usd(sim.balance)}</span>
          <span className="block text-[11px] font-semibold text-muted-foreground">limite {money.usd(sim.floor)}</span>
        </Stat>

        {isEvaluation ? (
          <Stat label="Obiettivo di profitto">
            <span className={sim.profit > 0 ? 'text-profit' : sim.profit < 0 ? 'text-loss' : undefined}>
              {money.usd(sim.profit)}
            </span>
            <span className="block text-[11px] font-semibold text-muted-foreground">
              su {money.usd(sim.requiredProfit ?? rules.profitTarget ?? 0)}
            </span>
          </Stat>
        ) : (
          <Stat label="Profitto">
            <span className={sim.cycleProfit > 0 ? 'text-profit' : sim.cycleProfit < 0 ? 'text-loss' : 'text-profit'}>
              {money.usd(sim.cycleProfit)}
            </span>
          </Stat>
        )}

        {isEvaluation ? (
          <>
            <Stat label="Giorni di trading">
              <span className="text-profit">{sim.tradingDays}</span>
              {rules.minTradingDays > 0 && (
                <span className="text-xs font-semibold text-muted-foreground"> / {rules.minTradingDays}</span>
              )}
            </Stat>
            <Stat
              label={consistency ? `Consistenza (${Math.round(consistency.limit * 100)}%)` : 'Consistenza'}
              hint={
                consistency && !consistency.ok && consistency.profitToFix > 0
                  ? `mancano ${money.usd(consistency.profitToFix)}`
                  : undefined
              }
            >
              {consistency ? (
                <span className={consistency.ok ? 'text-profit' : 'text-loss'}>
                  {consistency.share === null ? '—' : `${(consistency.share * 100).toFixed(2)}%`}
                </span>
              ) : (
                <span className="text-muted-foreground">Nessuna</span>
              )}
            </Stat>
          </>
        ) : (
          <>
            <Stat label="Minimo giornaliero">
              {rules.payout.winningDayMin > 0 ? money.usd(rules.payout.winningDayMin) : '—'}
            </Stat>
            <Stat
              label="Giorni in profitto"
            >
              {rules.payout.minWinningDays > 0 ? (
                <>
                  <span className={daysReady ? 'text-profit' : 'text-loss'}>{payout?.winningDays ?? 0}</span>
                  <span className="text-xs font-semibold text-muted-foreground"> / {rules.payout.minWinningDays}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Nessuno</span>
              )}
            </Stat>
          </>
        )}
      </div>

      {isEvaluation && targetBalance !== null && (
        <div>
          <TargetTrack floor={sim.floor} start={startBalanceOf(account)} balance={sim.balance} target={targetBalance} />
          <div className="mt-1 flex items-start justify-between">
            <div>
              <p className="font-sans text-sm font-bold tabular-nums text-loss">{money.usd(sim.floor)}</p>
              <p className="font-sans text-[9px] font-semibold uppercase tracking-wider text-loss/50">Limite</p>
            </div>
            <div className="text-right">
              <p className="font-sans text-sm font-bold tabular-nums text-profit">{money.usd(targetBalance)}</p>
              <p className="font-sans text-[9px] font-semibold uppercase tracking-wider text-profit/50">Obiettivo</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3.5">
        {isEvaluation && sim.status === 'passed' && !account.promotedTo && (
          <div className="rounded-lg border border-profit/30 bg-profit/10 px-3 py-2 font-sans text-[11px] text-profit">
            Obiettivo raggiunto: puoi passare al conto funded.
          </div>
        )}
        {isEvaluation && sim.status === 'passed' && !account.promotedTo && (
          <button
            type="button"
            onClick={() => onPromote(sim.endedOn)}
            className="h-9 rounded-lg bg-profit font-sans text-xs font-bold text-black transition-opacity hover:opacity-90"
          >
            Passa a Funded
          </button>
        )}
        {account.promotedTo && (
          <button
            type="button"
            onClick={() => onOpenAccount(account.promotedTo as string)}
            className="h-9 rounded-lg border border-profit/30 bg-profit/10 font-sans text-xs font-semibold text-profit transition-colors hover:bg-profit/15"
          >
            Passato a {isEvaluation ? 'Funded' : 'Live'} · apri il conto
          </button>
        )}
        {!isEvaluation && payout?.eligible && (
          <button
            type="button"
            onClick={() => onOpen('payout')}
            className="ej-payout-button h-9 rounded-lg bg-profit font-sans text-xs font-bold text-black transition-opacity hover:opacity-90"
          >
            Richiedi payout
          </button>
        )}
        <div className="flex gap-2">
          {((isEvaluation && !account.promotedTo && sim.status !== 'passed') || isBack2Funded(account, sim.status)) && (
            <button
              type="button"
              onClick={() => {
                if (confirmReset) {
                  onReset(sim.endedOn);
                  setConfirmReset(false);
                } else {
                  setConfirmReset(true);
                }
              }}
              onBlur={() => setConfirmReset(false)}
              className={cn(
                'h-9 flex-1 rounded-lg border font-sans text-xs font-semibold transition-colors',
                confirmReset
                  ? 'border-loss/50 bg-loss/10 text-loss'
                  : 'border-border bg-white/[0.04] hover:bg-white/10'
              )}
            >
              {confirmReset ? 'Conferma' : isBack2Funded(account, sim.status) ? 'Back2Funded' : 'Reset'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpen()}
            className="h-9 flex-1 rounded-lg border border-border bg-white/[0.04] font-sans text-xs font-semibold transition-colors hover:bg-white/10"
          >
            Dettagli
          </button>
        </div>
      </div>
    </div>
  );
}

/** Topstep: a burned Express Funded Account can be brought back to zero (Back2Funded, paid). */
export const isBack2Funded = (account: PropAccount, status: string) =>
  account.kind === 'funded' && account.firmId === 'topstep' && status === 'failed' && !account.promotedTo;

/** The day before a new phase starts is the last day of the previous one. */
const endOf = (startDate: string) => {
  const date = new Date(`${startDate}T12:00:00`);

  date.setDate(date.getDate() - 1);

  return date.toISOString().slice(0, 10);
};

export function PropfirmPage({ store, journals, getJournalTrades }: PropfirmPageProps) {
  const [adding, setAdding] = useState<{ firmId?: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | undefined>(undefined);
  const setOpenAt = (id: string) => openAccountAt(id);
  const openAccountAt = (id: string, section?: string) => {
    setOpenSection(section);
    setOpenId(id);
  };
  const openAccount = store.accounts.find(account => account.id === openId) ?? null;
  const detail = useMemo(
    () => (openAccount ? simulate(openAccount, getJournalTrades) : null),
    [openAccount, getJournalTrades]
  );

  // Burned accounts remember the day they ended, so later trades don't mark them on the calendar.
  const statuses = useMemo(
    () => new Map(store.accounts.map(account => [account.id, simulate(account, getJournalTrades).sim] as const)),
    [store.accounts, getJournalTrades]
  );

  useEffect(() => {
    store.accounts.forEach(account => {
      const sim = statuses.get(account.id);

      if (sim?.status === 'failed' && sim.endedOn && account.endDate !== sim.endedOn) {
        store.updateAccount(account.id, { endDate: sim.endedOn });
      }
    });
  }, [store, statuses]);

  const isArchived = (account: PropAccount) =>
    Boolean(account.promotedTo) || statuses.get(account.id)?.status === 'failed';
  const activeAccounts = store.accounts.filter(account => !isArchived(account));
  const archivedAccounts = store.accounts.filter(isArchived);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const renderFolders = (list: PropAccount[], open: boolean) => (
    <>
            {FIRMS.map(firm => ({
              firm,
              accounts: list.filter(account => account.firmId === firm.id),
            }))
              .filter(group => group.accounts.length > 0)
              .map(({ firm, accounts }) => (
                <FirmFolder key={firm.id} firm={firm} name={firm.name} count={accounts.length} defaultOpen={open}>
                  <div className="flex flex-col gap-5">
                    {(['evaluation', 'funded', 'live'] as const)
                      .map(kind => ({ kind, items: accounts.filter(account => account.kind === kind) }))
                      .filter(group => group.items.length > 0)
                      .map(({ kind, items }) => (
                        <div key={kind} className="flex flex-col gap-2.5">
                          <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {KIND_LABEL[kind]} <span className="font-medium">· {items.length}</span>
                          </p>
                          <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3 md:gap-4">
                            {items.map(account => (
                              <AccountCard
                                key={account.id}
                                account={account}
                                getJournalTrades={getJournalTrades}
                                onOpen={section => openAccountAt(account.id, section)}
                                onReset={endedOn => reset(account, endedOn)}
                                onPromote={passedOn => setPromoting({ account, passedOn, target: 'funded' })}
                                onOpenAccount={id => openAccountAt(id)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </FirmFolder>
              ))}
    </>
  );

  const create = ({ initialBalance, ...data }: NewAccount) => {
    const created = store.addAccount(data);

    if (initialBalance !== null) {
      store.updateAccount(created.id, {
        balanceUpdates: [{ date: data.startDate, balance: initialBalance }],
      });
    }

    setAdding(null);
    setOpenId(created.id);
  };

  const [promoting, setPromoting] = useState<{
    account: PropAccount;
    passedOn: string | null;
    target: 'funded' | 'live';
  } | null>(null);

  const startFunded = (
    account: PropAccount,
    options: { name: string; startDate: string },
    target: 'funded' | 'live' = 'funded'
  ) => {
    const created = store.addAccount({
      firmId: account.firmId,
      firmName: account.firmName,
      ruleSetId: account.ruleSetId,
      ruleSetName: account.ruleSetName,
      sizeLabel: account.sizeLabel,
      name: options.name,
      kind: target,
      size: account.size,
      rules: target === 'live' ? liveRulesFor(account) : fundedRulesFor(account),
      templateNote: account.templateNote,
      source: account.source,
      startDate: options.startDate,
      promotedFrom: account.id,
    });

    // The old phase is done: it moves to the archive (its trades stay on the calendar).
    store.updateAccount(account.id, { promotedTo: created.id, endDate: endOf(options.startDate) });
    setPromoting(null);
    setOpenAt(created.id);
  };

  const reset = (account: PropAccount, endedOn: string | null) => {
    if (isBack2Funded(account, 'failed') && account.kind === 'funded' && endedOn) {
      // Back2Funded: a fresh funded account; the burned one stays in the archive.
      const start = nextDay(endedOn);
      const created = store.addAccount({
        firmId: account.firmId,
        firmName: account.firmName,
        ruleSetId: account.ruleSetId,
        ruleSetName: account.ruleSetName,
        sizeLabel: account.sizeLabel,
        name: `${account.name} · B2F`,
        kind: 'funded',
        size: account.size,
        rules: account.rules,
        templateNote: account.templateNote,
        source: account.source,
        startDate: start,
        promotedFrom: account.id,
      });

      store.updateAccount(account.id, { promotedTo: created.id, endDate: endedOn });
      setOpenId(null);

      return;
    }

    store.updateAccount(account.id, {
      endDate: undefined,
      startDate: nextDay(endedOn ?? todayKey()),
      balanceUpdates: account.source.kind === 'manual' ? [] : account.balanceUpdates,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-sans text-[15px] font-semibold tracking-tight">I tuoi conti</h2>
            <p className="font-sans text-xs text-muted-foreground">
              Simula valutazioni e conti funded con le regole delle prop firm e tieni traccia dei payout.
            </p>
          </div>
          <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-white text-black hover:bg-white/90"
            onClick={() => setAdding({})}
          >
            <Plus className="size-3.5" />
            Aggiungi conto
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setGuideOpen(true)}>
            Guida alle regole
          </Button>
          </div>
        </div>

        {activeAccounts.length === 0 && archivedAccounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <p className="font-sans text-sm font-semibold">Nessun conto simulato</p>
            <p className="mx-auto mt-1 max-w-md font-sans text-xs text-muted-foreground">
              Scegli una firm qui sotto: i tuoi trade del calendario aggiornano da soli saldo, drawdown e obiettivo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {renderFolders(activeAccounts, true)}
            {activeAccounts
              .filter(account => !FIRMS.some(firm => firm.id === account.firmId))
              .map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  getJournalTrades={getJournalTrades}
                  onOpen={section => openAccountAt(account.id, section)}
                  onReset={endedOn => reset(account, endedOn)}
                  onPromote={passedOn => setPromoting({ account, passedOn, target: 'funded' })}
                  onOpenAccount={id => openAccountAt(id)}
                />
              ))}
          </div>
        )}
      </section>

      {archivedAccounts.length > 0 && (
        <section className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={archiveOpen}
            onClick={() => setArchiveOpen(value => !value)}
            className="flex items-center gap-2 text-left"
          >
            <h2 className="font-sans text-[15px] font-semibold tracking-tight">Archivio</h2>
            <span className="font-sans text-xs text-muted-foreground">
              {archivedAccounts.length} · conti passati o bruciati
            </span>
            <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', archiveOpen && 'rotate-180')} />
          </button>
          {archiveOpen && <div className="flex flex-col gap-6">{renderFolders(archivedAccounts, false)}</div>}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-[15px] font-semibold tracking-tight">Scegli una firm</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 md:gap-4">
          {FIRMS.map(firm => (
            <button
              key={firm.id}
              type="button"
              onClick={() => setAdding({ firmId: firm.id })}
              className={cn(
                'flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-b px-3 py-7 font-sans text-sm font-medium text-white transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-ring',
                firm.tile
              )}
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-black/40 text-base font-bold">
                {firm.logo ? <FirmMark firm={firm} className="size-12" /> : firm.initials}
              </span>
              {firm.name}
            </button>
          ))}
        </div>
      </section>

      <AddAccountDialog
        open={adding !== null}
        initialFirmId={adding?.firmId}
        onClose={() => setAdding(null)}
        onCreate={create}
        journals={journals}
        existingAccounts={store.accounts}
      />

      <RulesGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />

      <PromoteDialog
        account={promoting?.account ?? null}
        target={promoting?.target}
        passedOn={promoting?.passedOn ?? null}
        onClose={() => setPromoting(null)}
        onConfirm={options => promoting && startFunded(promoting.account, options, promoting.target)}
      />

      {openAccount && detail && (
        <AccountDetailDialog
          key={openAccount.id}
          account={openAccount}
          sim={detail.sim}
          days={detail.days}
          trades={getAccountTrades(openAccount, getJournalTrades)}
          journalName={
            openAccount.source.kind === 'journal'
              ? journals.find(journal => journal.id === (openAccount.source as { journalId: string }).journalId)?.name ?? null
              : null
          }
          onClose={() => setOpenId(null)}
          onUpdate={patch => store.updateAccount(openAccount.id, patch)}
          onDelete={() => {
            store.deleteAccount(openAccount.id);
            setOpenId(null);
          }}
          onAddPayout={payout => store.addPayout(openAccount.id, payout)}
          onRemovePayout={payoutId => store.removePayout(openAccount.id, payoutId)}
          onStartFunded={() => setPromoting({ account: openAccount, passedOn: detail.sim.endedOn, target: 'funded' })}
          onStartLive={() => setPromoting({ account: openAccount, passedOn: null, target: 'live' })}
          initialSection={openSection}
          onReset={() => reset(openAccount, detail.sim.endedOn)}
        />
      )}
    </div>
  );
}
