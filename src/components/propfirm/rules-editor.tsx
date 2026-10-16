'use client';

import { Input } from '@/components/ui/input';
import type { DrawdownType, PropRules } from '@/lib/propfirm/types';

const SELECT =
  'ej-filter-select h-9 w-full rounded-lg border border-border bg-background/60 px-3 font-sans text-xs outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="font-sans text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** Number input where an empty field means "not set" (null). */
function NumberInput({
  value,
  onChange,
  placeholder = '—',
  suffix,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        value={value === null ? '' : String(value)}
        placeholder={placeholder}
        className="h-9 text-sm tabular-nums"
        onChange={event => {
          const raw = event.target.value.replace(',', '.').trim();

          if (raw === '') return onChange(null);

          const parsed = Number(raw);

          if (Number.isFinite(parsed)) onChange(parsed);
        }}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-sans text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

interface RulesEditorProps {
  rules: PropRules;
  isEvaluation: boolean;
  onChange: (rules: PropRules) => void;
}

export function RulesEditor({ rules, isEvaluation, onChange }: RulesEditorProps) {
  const set = (patch: Partial<PropRules>) => onChange({ ...rules, ...patch });
  const setPayout = (patch: Partial<PropRules['payout']>) =>
    set({ payout: { ...rules.payout, ...patch } });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {isEvaluation && (
        <Field label="Obiettivo di profitto (USD)">
          <NumberInput value={rules.profitTarget} onChange={profitTarget => set({ profitTarget })} />
        </Field>
      )}

      <Field label="Max drawdown (USD)">
        <NumberInput
          value={rules.drawdown.amount}
          onChange={amount => set({ drawdown: { ...rules.drawdown, amount } })}
        />
      </Field>

      <Field label="Tipo di drawdown">
        <select
          className={SELECT}
          value={rules.drawdown.type}
          onChange={event =>
            set({ drawdown: { ...rules.drawdown, type: event.target.value as DrawdownType } })
          }
        >
          <option value="eod-trailing">Trailing a fine giornata</option>
          <option value="intraday-trailing">Trailing intraday (approssimato)</option>
          <option value="static">Fisso</option>
        </select>
      </Field>

      <Field label="Il floor si ferma al saldo iniziale">
        <select
          className={SELECT}
          value={rules.drawdown.locksAtStart ? 'yes' : 'no'}
          onChange={event =>
            set({ drawdown: { ...rules.drawdown, locksAtStart: event.target.value === 'yes' } })
          }
        >
          <option value="yes">Sì</option>
          <option value="no">No</option>
        </select>
      </Field>

      <Field label="Limite di perdita giornaliero (USD)">
        <NumberInput
          value={rules.dailyLossLimit?.amount ?? null}
          placeholder="Nessuno"
          onChange={amount =>
            set({
              dailyLossLimit:
                amount === null || amount <= 0
                  ? null
                  : { amount, effect: rules.dailyLossLimit?.effect ?? 'breach' },
            })
          }
        />
      </Field>

      <Field label="Quando lo raggiungi">
        <select
          className={SELECT}
          disabled={!rules.dailyLossLimit}
          value={rules.dailyLossLimit?.effect ?? 'breach'}
          onChange={event =>
            rules.dailyLossLimit &&
            set({
              dailyLossLimit: {
                ...rules.dailyLossLimit,
                effect: event.target.value as 'breach' | 'lock-day',
              },
            })
          }
        >
          <option value="breach">Il conto fallisce</option>
          <option value="lock-day">Si blocca solo il giorno</option>
        </select>
      </Field>

      <Field label="Consistenza: giorno migliore al massimo (%)">
        <NumberInput
          value={rules.consistency ? Math.round(rules.consistency.maxDayShare * 100) : null}
          placeholder="Nessuna"
          suffix="%"
          onChange={percent =>
            set({
              consistency:
                percent === null || percent <= 0 || percent >= 100
                  ? null
                  : {
                      maxDayShare: percent / 100,
                      appliesTo: rules.consistency?.appliesTo ?? 'evaluation',
                    },
            })
          }
        />
      </Field>

      <Field label="La consistenza vale per">
        <select
          className={SELECT}
          disabled={!rules.consistency}
          value={rules.consistency?.appliesTo ?? 'evaluation'}
          onChange={event =>
            rules.consistency &&
            set({
              consistency: {
                ...rules.consistency,
                appliesTo: event.target.value as 'evaluation' | 'funded' | 'both',
              },
            })
          }
        >
          <option value="evaluation">La valutazione</option>
          <option value="funded">Funded e live (payout)</option>
          <option value="both">Entrambi</option>
        </select>
      </Field>

      <Field label="Giorni di trading minimi">
        <NumberInput
          value={rules.minTradingDays}
          onChange={value => set({ minTradingDays: Math.max(0, Math.round(value ?? 0)) })}
        />
      </Field>

      <Field label="Quota che ti spetta sui payout (%)">
        <NumberInput
          value={Math.round(rules.payout.split * 100)}
          suffix="%"
          onChange={value => setPayout({ split: Math.min(100, Math.max(0, value ?? 0)) / 100 })}
        />
      </Field>

      <Field label="Payout minimo (USD)">
        <NumberInput
          value={rules.payout.minRequest}
          onChange={value => setPayout({ minRequest: Math.max(0, value ?? 0) })}
        />
      </Field>

      <Field label="Giorni vincenti richiesti">
        <NumberInput
          value={rules.payout.minWinningDays}
          onChange={value => setPayout({ minWinningDays: Math.max(0, Math.round(value ?? 0)) })}
        />
      </Field>

      <Field label="Un giorno vincente chiude con almeno (USD)">
        <NumberInput
          value={rules.payout.winningDayMin}
          onChange={value => setPayout({ winningDayMin: Math.max(0, value ?? 0) })}
        />
      </Field>

      <Field label="Profitto da lasciare nel conto (USD)">
        <NumberInput
          value={rules.payout.buffer}
          onChange={value => setPayout({ buffer: Math.max(0, value ?? 0) })}
        />
      </Field>

      <Field label="Massimo per payout (USD)">
        <NumberInput
          value={rules.payout.capPerPayout}
          placeholder="Nessuno"
          onChange={capPerPayout => setPayout({ capPerPayout })}
        />
      </Field>

      <Field label="Contratti massimi (solo testo)">
        <Input
          value={rules.maxContracts ?? ''}
          placeholder="—"
          className="h-9 text-sm"
          onChange={event => set({ maxContracts: event.target.value || null })}
        />
      </Field>
    </div>
  );
}
