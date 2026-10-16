'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { usePropAccounts } from '@/hooks/use-prop-accounts';
import { getAccountDays } from '@/lib/propfirm/days';
import { simulateAccount } from '@/lib/propfirm/engine';
import { FIRMS, getFirm } from '@/lib/propfirm/firms';
import type { PropAccount } from '@/lib/propfirm/types';
import type { Trade } from '@/lib/types/trade';
import { cn } from '@/lib/utils';
import { AccountDetailDialog } from './account-detail-dialog';
import { AddAccountDialog, type NewAccount } from './add-account-dialog';
import {
  FirmFolder,
  FirmMark,
  KIND_LABEL,
  ProgressBar,
  StatusBadge,
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

function AccountCard({
  account,
  getJournalTrades,
  onOpen,
}: {
  account: PropAccount;
  getJournalTrades: (id: string) => Trade[];
  onOpen: () => void;
}) {
  const money = useMoney();
  const firm = getFirm(account.firmId);
  const { sim } = useMemo(() => simulate(account, getJournalTrades), [account, getJournalTrades]);
  const drawdown = account.rules.drawdown.amount ?? 0;
  const roomPercent = drawdown > 0 ? (sim.room / drawdown) * 100 : 100;
  const targetPercent =
    sim.requiredProfit && sim.requiredProfit > 0 ? (Math.max(0, sim.profit) / sim.requiredProfit) * 100 : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-white/25 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-3">
        {firm && <FirmMark firm={firm} className="size-10 text-xs" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-sm font-semibold">{account.name}</p>
          <p className="truncate font-sans text-xs text-muted-foreground">
            {account.firmName} · {account.sizeLabel} {account.ruleSetName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={sim.status} />
          <span className="font-sans text-[10px] text-muted-foreground">{KIND_LABEL[account.kind]}</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-sans text-[11px] text-muted-foreground">Saldo</p>
          <p className="font-sans text-lg font-semibold tabular-nums">{money.usd(sim.balance)}</p>
        </div>
        <div className="text-right">
          <p className="font-sans text-[11px] text-muted-foreground">Profitto attuale</p>
          <p
            className={cn(
              'font-sans text-sm font-semibold tabular-nums',
              sim.profit > 0 ? 'text-profit' : sim.profit < 0 ? 'text-loss' : 'text-muted-foreground'
            )}
          >
            {money.signed(sim.profit)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between font-sans text-[11px] text-muted-foreground">
            <span>Margine</span>
            <span className="tabular-nums">{money.usd(sim.room)}</span>
          </div>
          <ProgressBar value={roomPercent} tone={roomPercent <= 25 ? 'loss' : 'neutral'} />
        </div>
        {account.kind === 'evaluation' ? (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between font-sans text-[11px] text-muted-foreground">
              <span>Obiettivo</span>
              <span className="tabular-nums">
                {sim.requiredProfit === null ? '—' : `${Math.round(Math.min(100, targetPercent))}%`}
              </span>
            </div>
            <ProgressBar value={targetPercent} tone="profit" />
          </div>
        ) : (
          sim.payout && (
            <div className="flex justify-between font-sans text-[11px] text-muted-foreground">
              <span>Payout disponibile</span>
              <span className={cn('tabular-nums', sim.payout.eligible && 'text-profit')}>
                {money.usd(sim.payout.available)}
              </span>
            </div>
          )
        )}
      </div>
    </button>
  );
}

export function PropfirmPage({ store, journals, getJournalTrades }: PropfirmPageProps) {
  const [adding, setAdding] = useState<{ firmId?: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const openAccount = store.accounts.find(account => account.id === openId) ?? null;
  const detail = useMemo(
    () => (openAccount ? simulate(openAccount, getJournalTrades) : null),
    [openAccount, getJournalTrades]
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

  const startFunded = (account: PropAccount) => {
    const size = getFirm(account.firmId)
      ?.ruleSets.find(set => set.id === account.ruleSetId)
      ?.sizes.find(item => item.label === account.sizeLabel);
    const rules = structuredClone({
      ...account.rules,
      profitTarget: null,
      ...size?.fundedOverrides,
    });
    const ended = detail?.sim.endedOn ?? todayKey();
    const created = store.addAccount({
      firmId: account.firmId,
      firmName: account.firmName,
      ruleSetId: account.ruleSetId,
      ruleSetName: account.ruleSetName,
      sizeLabel: account.sizeLabel,
      name: /eval/i.test(account.name) ? account.name.replace(/eval/i, 'Funded') : `${account.name} · Funded`,
      kind: 'funded',
      size: account.size,
      rules,
      templateNote: account.templateNote,
      source: account.source,
      startDate: nextDay(ended),
    });

    setOpenId(created.id);
  };

  const reset = (account: PropAccount) => {
    store.updateAccount(account.id, {
      startDate: nextDay(detail?.sim.endedOn ?? todayKey()),
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
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-[#0a84ff] text-white hover:bg-[#0a84ff]/90"
            onClick={() => setAdding({})}
          >
            <Plus className="size-3.5" />
            Aggiungi conto
          </Button>
        </div>

        {store.accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <p className="font-sans text-sm font-semibold">Nessun conto simulato</p>
            <p className="mx-auto mt-1 max-w-md font-sans text-xs text-muted-foreground">
              Scegli una firm qui sotto: i tuoi trade del calendario aggiornano da soli saldo, drawdown e obiettivo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {FIRMS.map(firm => ({
              firm,
              accounts: store.accounts.filter(account => account.firmId === firm.id),
            }))
              .filter(group => group.accounts.length > 0)
              .map(({ firm, accounts }) => (
                <FirmFolder key={firm.id} firm={firm} name={firm.name} count={accounts.length} defaultOpen>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 md:gap-4">
                    {accounts.map(account => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        getJournalTrades={getJournalTrades}
                        onOpen={() => setOpenId(account.id)}
                      />
                    ))}
                  </div>
                </FirmFolder>
              ))}
            {store.accounts
              .filter(account => !FIRMS.some(firm => firm.id === account.firmId))
              .map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  getJournalTrades={getJournalTrades}
                  onOpen={() => setOpenId(account.id)}
                />
              ))}
          </div>
        )}
      </section>

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

      {openAccount && detail && (
        <AccountDetailDialog
          key={openAccount.id}
          account={openAccount}
          sim={detail.sim}
          days={detail.days}
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
          onStartFunded={() => startFunded(openAccount)}
          onReset={() => reset(openAccount)}
        />
      )}
    </div>
  );
}
