'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { RulesEditor } from './rules-editor';
import {
  FIRMS,
  rulesForKind,
  type FirmDef,
  type RuleSetDef,
  type SizeDef,
} from '@/lib/propfirm/firms';
import type { AccountKind, PropAccount, PropRules } from '@/lib/propfirm/types';
import { cn } from '@/lib/utils';
import { FirmMark, KIND_LABEL, formatUsd, todayKey } from './shared';

type Step = 'firm' | 'plan' | 'name' | 'confirm';
const STEPS: { id: Step; label: string }[] = [
  { id: 'firm', label: 'Firm' },
  { id: 'plan', label: 'Piano' },
  { id: 'name', label: 'Nome' },
  { id: 'confirm', label: 'Conferma' },
];

export type NewAccount = Omit<PropAccount, 'id' | 'createdAt' | 'payouts' | 'balanceUpdates'> & {
  initialBalance: number | null;
};

interface AddAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (account: NewAccount) => void;
  journals: { id: string; name: string }[];
  existingAccounts: PropAccount[];
  initialFirmId?: string;
}

const k = (value: number) => `${value / 1000}K`;
const dollars = (value: number | null) => (value === null ? '—' : formatUsd(value));

export function AddAccountDialog({
  open,
  onClose,
  onCreate,
  journals,
  existingAccounts,
  initialFirmId,
}: AddAccountDialogProps) {
  const [step, setStep] = useState<Step>('firm');
  const [search, setSearch] = useState('');
  const [firm, setFirm] = useState<FirmDef | null>(null);
  const [ruleSet, setRuleSet] = useState<RuleSetDef | null>(null);
  const [size, setSize] = useState<SizeDef | null>(null);
  const [kind, setKind] = useState<AccountKind>('evaluation');
  const [name, setName] = useState('');
  const sourceKind = 'journal' as const;
  const [journalId, setJournalId] = useState('');
  const [startDate, setStartDate] = useState(todayKey());
  const [customRules, setCustomRules] = useState<PropRules | null>(null);
  const [customSize, setCustomSize] = useState('');

  useEffect(() => {
    if (!open) return;

    setStep('firm');
    setSearch('');
    setFirm(null);
    setRuleSet(null);
    setSize(null);
    setKind('evaluation');
    setName('');
    setJournalId(journals[0]?.id ?? '');
    setStartDate(todayKey());
    setCustomRules(null);
    setCustomSize('');

    const preselected = FIRMS.find(item => item.id === initialFirmId);

    if (preselected) pickFirm(preselected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pickFirm = (item: FirmDef) => {
    setFirm(item);
    setRuleSet(null);
    setSize(null);
    setStep('plan');
  };

  const kindWord = kind === 'evaluation' ? 'Eval' : KIND_LABEL[kind];
  const suggestedName = useMemo(() => {
    if (!firm) return '';

    const short = firm.name.split(' ')[0];
    const count = existingAccounts.filter(
      account => account.firmId === firm.id && account.kind === kind
    ).length;

    return `${short} ${kindWord} ${count + 1}`;
  }, [firm, kind, kindWord, existingAccounts]);

  const finalName = name.trim() || suggestedName;
  const parsedCustomSize = Number(customSize.replace(/[^\d.]/g, ''));
  const effectiveSize =
    firm?.custom && size ? { ...size, size: parsedCustomSize > 0 ? parsedCustomSize : size.size } : size;
  const rules =
    effectiveSize && size ? (firm?.custom ? customRules ?? rulesForKind(size, kind, firm.id, ruleSet?.id) : rulesForKind(size, kind, firm?.id, ruleSet?.id)) : null;
  const filteredFirms = FIRMS.filter(item =>
    item.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const stepIndex = STEPS.findIndex(item => item.id === step);
  const goBack = () => {
    if (step === 'plan') setStep('firm');
    if (step === 'name') setStep('plan');
    if (step === 'confirm') setStep('name');
  };
  const canContinueName = Boolean(journalId);

  const create = () => {
    if (!firm || !ruleSet || !size || !effectiveSize || !rules) return;

    onCreate({
      firmId: firm.id,
      firmName: firm.name,
      ruleSetId: ruleSet.id,
      ruleSetName: ruleSet.name,
      sizeLabel: firm.custom ? k(effectiveSize.size) : size.label,
      name: finalName,
      kind,
      size: effectiveSize.size,
      rules,
      templateNote: ruleSet.note,
      source: { kind: 'journal', journalId },
      startDate,
      initialBalance: null,
    });
  };

  const titles: Record<Step, string> = {
    firm: 'Scegli una firm',
    plan: firm ? `${firm.name}: scegli un piano` : 'Scegli un piano',
    name: 'Dai un nome al conto',
    confirm: 'Conferma',
  };

  return (
    <Dialog open={open} onOpenChange={next => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(720px,92dvh)] w-[calc(100vw-1.25rem)] max-w-4xl gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 sm:w-[92vw]"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <DialogDescription className="sr-only">
          Percorso guidato per aggiungere un conto prop firm simulato.
        </DialogDescription>

        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border bg-background/60 p-5 md:flex">
          <p className="mb-5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Aggiungi conto
          </p>
          <ol className="flex flex-col gap-4">
            {STEPS.map((item, index) => (
              <li key={item.id} className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-1 size-3 shrink-0 rounded-full border',
                    index < stepIndex && 'border-white/60 bg-white/60',
                    index === stepIndex && 'border-white bg-transparent',
                    index > stepIndex && 'border-white/20'
                  )}
                />
                <div>
                  <p className={cn('font-sans text-sm', index <= stepIndex ? 'text-foreground' : 'text-muted-foreground')}>
                    {item.label}
                  </p>
                  {index === 0 && firm && index < stepIndex && (
                    <p className="font-sans text-xs text-muted-foreground">{firm.name}</p>
                  )}
                  {index === 1 && size && index < stepIndex && (
                    <p className="font-sans text-xs text-muted-foreground">
                      {size.label} {ruleSet?.name}
                    </p>
                  )}
                  {index === 2 && index < stepIndex && (
                    <p className="font-sans text-xs text-muted-foreground">{finalName}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-auto font-sans text-xs leading-relaxed text-muted-foreground">
            Le regole sono quelle ufficiali del piano della firm e non si possono modificare.
          </p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 sm:px-6">
            {step !== 'firm' && (
              <button
                type="button"
                aria-label="Indietro"
                onClick={goBack}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <DialogTitle className="flex-1 font-sans text-base font-semibold">{titles[step]}</DialogTitle>
            <button
              type="button"
              aria-label="Chiudi"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="ej-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {step === 'firm' && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Cerca una firm…"
                    className="h-10 pl-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {filteredFirms.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => pickFirm(item)}
                      className={cn(
                        'flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-b px-3 py-6 font-sans text-sm font-medium text-white transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-ring',
                        item.tile
                      )}
                    >
                      <span className="flex size-12 items-center justify-center rounded-xl bg-black/40 text-base font-bold">
                        {item.logo ? (
                          <FirmMark firm={item} className="size-12" />
                        ) : (
                          item.initials
                        )}
                      </span>
                      {item.name}
                    </button>
                  ))}
                  {filteredFirms.length === 0 && (
                    <p className="col-span-full py-8 text-center font-sans text-sm text-muted-foreground">
                      Nessuna firm trovata.
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 'plan' && firm && (
              <div className="flex flex-col gap-5">
                {(
                  <div>
                    <p className="mb-2 text-center font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tipo di regole
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {firm.ruleSets.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setRuleSet(item);
                            setSize(null);
                            setKind(item.fundedOnly ? 'funded' : 'evaluation');
                          }}
                          className={cn(
                            'rounded-xl border px-4 py-2 font-sans text-sm transition-colors',
                            ruleSet?.id === item.id
                              ? 'border-white/60 bg-white/15 text-foreground'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {ruleSet ? (
                  <div>
                    <p className="mb-2 text-center font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Dimensione del conto
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {ruleSet.sizes.map(item => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setSize(item);
                            setCustomRules(null);
                            setCustomSize(String(item.size));
                            setStep('name');
                          }}
                          className="flex flex-col gap-4 rounded-2xl border border-border bg-background/40 p-5 text-left transition-colors hover:border-white/30 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="font-sans text-2xl font-semibold tracking-tight">${item.label}</span>
                          <dl className="flex flex-col gap-1.5 font-sans text-xs">
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Obiettivo</dt>
                              <dd className="font-semibold">{dollars(item.rules.profitTarget)}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Max drawdown</dt>
                              <dd className="font-semibold">{dollars(item.rules.drawdown.amount)}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Giornaliero</dt>
                              <dd className="font-semibold">
                                {item.rules.dailyLossLimit ? dollars(item.rules.dailyLossLimit.amount) : 'Nessuno'}
                              </dd>
                            </div>
                          </dl>
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 text-center font-sans text-[11px] leading-relaxed text-muted-foreground">
                      {ruleSet.note}
                    </p>
                  </div>
                ) : (
                  <p className="py-10 text-center font-sans text-sm text-muted-foreground">
                    Scegli un tipo di regole per vedere le dimensioni del conto.
                  </p>
                )}
              </div>
            )}

            {step === 'name' && firm && size && (
              <div className="mx-auto flex max-w-xl flex-col gap-6">
                <div className="mx-auto flex rounded-xl bg-secondary p-1">
                  {(ruleSet?.fundedOnly ? (['funded', 'live'] as const) : (['evaluation', 'funded', 'live'] as const)).map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setKind(item)}
                      className={cn(
                        'rounded-lg px-4 py-1.5 font-sans text-sm font-medium transition',
                        kind === item ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {KIND_LABEL[item]}
                    </button>
                  ))}
                </div>

                <label className="flex flex-col gap-2">
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome del conto
                  </span>
                  <Input
                    value={name}
                    maxLength={40}
                    onChange={event => setName(event.target.value)}
                    placeholder={suggestedName}
                    className="h-11 text-lg font-semibold"
                  />
                </label>
                <div className="-mt-3 flex flex-wrap gap-2">
                  {[suggestedName, `${firm.name} ${size.label} ${ruleSet?.name ?? ''}`.trim()].map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setName(item)}
                      className="rounded-lg border border-border px-3 py-1.5 font-sans text-xs text-muted-foreground hover:text-foreground"
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {(
                  <label className="flex flex-col gap-2">
                    <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Journal collegato
                    </span>
                    <select
                      value={journalId}
                      onChange={event => setJournalId(event.target.value)}
                      className="ej-filter-select h-10 rounded-lg border border-border bg-background/60 px-3 font-sans text-sm outline-none"
                    >
                      {journals.map(journal => (
                        <option key={journal.id} value={journal.id}>
                          {journal.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="flex flex-col gap-2">
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Data di inizio
                  </span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={event => setStartDate(event.target.value || todayKey())}
                    className="ej-date-input-no-indicator h-10 max-w-[200px]"
                  />
                  <span className="font-sans text-xs text-muted-foreground">
                    I trade non assegnati contano da questo giorno in poi; quelli che assegni a questo conto contano sempre.
                  </span>
                </label>

              </div>
            )}

            {step === 'confirm' && firm && size && rules && (
              <div className="mx-auto flex max-w-xl flex-col gap-5">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <FirmMark firm={firm} className="size-12" />
                  <div>
                    <p className="font-sans text-lg font-semibold">{finalName}</p>
                    <p className="font-sans text-xs text-muted-foreground">
                      {firm.name} · {firm.custom ? k(effectiveSize?.size ?? size.size) : size.label} {ruleSet?.name}
                    </p>
                  </div>
                </div>
                {firm.custom && (
                  <div className="flex flex-col gap-4 rounded-xl border border-border bg-background/30 p-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Dimensione del conto (USD)
                      </span>
                      <Input
                        inputMode="numeric"
                        value={customSize}
                        onChange={event => setCustomSize(event.target.value)}
                        className="h-10"
                      />
                    </label>
                    <RulesEditor rules={rules} isEvaluation={kind === 'evaluation'} onChange={setCustomRules} />
                  </div>
                )}
                <dl className="flex flex-col gap-3 font-sans text-sm">
                  {[
                    ['Tipo di conto', KIND_LABEL[kind]],
                    ['Dimensione', formatUsd(effectiveSize?.size ?? size.size)],
                    ['Obiettivo di profitto', kind === 'evaluation' ? dollars(rules.profitTarget) : 'Nessuno'],
                    [
                      'Max drawdown',
                      `${dollars(rules.drawdown.amount)} · ${
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
                        ? `${dollars(rules.dailyLossLimit.amount)} · ${rules.dailyLossLimit.effect === 'breach' ? 'violazione' : 'blocca il giorno'}`
                        : 'Nessuno',
                    ],
                    ['Contratti massimi', rules.maxContracts ?? '—'],
                    ['Split sui profitti', `${Math.round(rules.payout.split * 100)}/${Math.round((1 - rules.payout.split) * 100)}`],
                    ['Journal collegato', journals.find(item => item.id === journalId)?.name ?? '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="font-sans text-[11px] leading-relaxed text-muted-foreground">{ruleSet?.note}</p>
              </div>
            )}
          </div>

          {(step === 'name' || step === 'confirm') && (
            <div className="flex justify-end border-t border-border px-4 py-3.5 sm:px-6">
              {step === 'name' ? (
                <Button
                  type="button"
                  className="bg-white px-6 text-black hover:bg-white/90"
                  disabled={!canContinueName}
                  onClick={() => setStep('confirm')}
                >
                  Continua
                </Button>
              ) : (
                <Button type="button" className="bg-white px-6 text-black hover:bg-white/90" onClick={create}>
                  Crea conto
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
