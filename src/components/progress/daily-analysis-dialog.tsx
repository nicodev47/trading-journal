'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { usePreferences } from '@/contexts/preferences-context';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { generateId } from '@/lib/calculations';
import { getMenuOptions } from '@/lib/preferences';
import type { CaseStudy, DailyAnalysis, MissedTrade, Trade } from '@/lib/types/trade';
import { cn } from '@/lib/utils';
import { AttachmentsField } from './attachments-field';

const SELECT_CLASS =
  'ej-filter-select h-9 w-full rounded-lg border border-border bg-background/60 px-3 font-sans text-xs text-foreground outline-none transition-colors hover:bg-secondary/40 focus:border-ring/60';

interface DailyAnalysisDialogProps {
  open: boolean;
  date: string;
  entry?: DailyAnalysis;
  missedTrades: MissedTrade[];
  trades: Trade[];
  onClose: () => void;
  onSave: (entry: DailyAnalysis) => void;
  onDelete: (date: string) => void;
  onAddMissed: (missed: MissedTrade) => void;
  onUpdateMissed: (id: string, updates: Partial<MissedTrade>) => void;
  onDeleteMissed: (id: string) => void;
}

const formatDate = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`);

  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
};

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-background/30 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-sans text-[13px] font-semibold tracking-tight">{title}</h3>
          {hint && <p className="mt-0.5 font-sans text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="font-sans text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function DailyAnalysisDialog({
  open,
  date,
  entry,
  missedTrades,
  trades,
  onClose,
  onSave,
  onDelete,
  onAddMissed,
  onUpdateMissed,
  onDeleteMissed,
}: DailyAnalysisDialogProps) {
  const { preferences } = usePreferences();
  const { streamerMode } = useStreamerMode();
  const [analysis, setAnalysis] = useState('');
  const [observations, setObservations] = useState('');
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const loadedDate = useRef<string | null>(null);
  const timer = useRef<number | null>(null);

  // Load the draft when a day is opened (and only then, not on every save).
  useEffect(() => {
    if (!open) {
      loadedDate.current = null;
      return;
    }

    if (loadedDate.current === date) return;

    loadedDate.current = date;
    setAnalysis(entry?.analysis ?? '');
    setObservations(entry?.observations ?? '');
    setCaseStudies(entry?.caseStudies ?? []);
  }, [open, date, entry]);

  type Draft = { analysis: string; observations: string; caseStudies: CaseStudy[] };
  const pending = useRef<Draft | null>(null);
  const latest = useRef({ date, entry, onSave, onDelete });

  latest.current = { date, entry, onSave, onDelete };

  const flush = () => {
    if (timer.current) window.clearTimeout(timer.current);

    timer.current = null;

    const next = pending.current;

    pending.current = null;

    if (!next) return;

    const { date: day, entry: current, onSave: save, onDelete: remove } = latest.current;
    const empty =
      !next.analysis.trim() && !next.observations.trim() && next.caseStudies.length === 0;

    if (empty) {
      remove(day);
      return;
    }

    const now = new Date().toISOString();

    save({
      id: current?.id ?? generateId(),
      date: day,
      ...next,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    });
  };

  const persist = (next: Draft) => {
    pending.current = next;

    if (timer.current) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(flush, 500);
  };

  const update = (patch: Partial<{ analysis: string; observations: string; caseStudies: CaseStudy[] }>) => {
    const next = { analysis, observations, caseStudies, ...patch };

    if (patch.analysis !== undefined) setAnalysis(patch.analysis);
    if (patch.observations !== undefined) setObservations(patch.observations);
    if (patch.caseStudies !== undefined) setCaseStudies(patch.caseStudies);

    persist(next);
  };

  // Never lose the last keystrokes when the page is left.
  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dayPnl = trades.reduce((sum, trade) => sum + trade.pnl - trade.commission, 0);
  const addMissed = () => {
    const now = new Date().toISOString();

    onAddMissed({
      id: generateId(),
      date,
      potentialPnl: 0,
      asset: '',
      direction: '',
      time: '',
      setup: '',
      reason: '',
      screenshots: [],
      notes: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
  };
  const updateCase = (id: string, patch: Partial<CaseStudy>) =>
    update({
      caseStudies: caseStudies.map(item => (item.id === id ? { ...item, ...patch } : item)),
    });

  const tradeLabel = (trade: Trade) =>
    `${trade.pair || '—'} ${trade.direction} ${(trade.exitDate.split('T')[1] ?? '').slice(0, 5)}${
      streamerMode ? '' : ` · ${trade.pnl - trade.commission > 0 ? '+' : ''}${(trade.pnl - trade.commission).toFixed(2)}`
    }`;

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) {
          flush();
          onClose();
        }
      }}
    >
      <DialogContent
        className="ej-scrollbar max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-3xl gap-0 overflow-y-auto p-0 sm:w-[92vw]"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3.5 text-left backdrop-blur sm:px-6 sm:py-4">
          <DialogTitle className="font-sans text-base capitalize">{formatDate(date)}</DialogTitle>
          <DialogDescription className="font-sans text-xs">
            {trades.length > 0
              ? `Eseguiti ${trades.length} ${trades.length === 1 ? 'trade' : 'trade'}${
                  streamerMode ? '' : ` · ${dayPnl > 0 ? '+' : ''}${dayPnl.toFixed(2)} USD`
                }. Qui scrivi tutto quello che c’è dietro: si salva da solo.`
              : 'Nessun trade eseguito questo giorno. Qui scrivi tutto quello che c’è dietro: si salva da solo.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <Section title="Analisi della giornata" hint="Contesto di mercato, bias, livelli che hai preparato.">
            <Textarea
              value={analysis}
              onChange={event => update({ analysis: event.target.value })}
              placeholder="Cosa ti aspettavi oggi e perché?"
              className="min-h-[96px] resize-y border-border/70 bg-background/60 text-sm"
            />
          </Section>

          <Section title="Cosa ho visto" hint="Cosa è successo davvero, cosa ti ha sorpreso, cosa hai imparato.">
            <Textarea
              value={observations}
              onChange={event => update({ observations: event.target.value })}
              placeholder="Com’è andata la giornata rispetto al piano?"
              className="min-h-[96px] resize-y border-border/70 bg-background/60 text-sm"
            />
          </Section>

          <Section
            title="Operazioni mancate"
            hint="Setup validi che hai visto e non hai preso."
            action={
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={addMissed}>
                <Plus className="size-3" />
                Aggiungi
              </Button>
            }
          >
            {missedTrades.length === 0 ? (
              <p className="font-sans text-xs text-muted-foreground">Nessuna operazione mancata registrata.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {missedTrades.map(item => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/40 p-3">
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
                      <Field label="Asset">
                        <select
                          className={SELECT_CLASS}
                          value={item.asset}
                          onChange={event => onUpdateMissed(item.id, { asset: event.target.value })}
                        >
                          <option value="">--</option>
                          {getMenuOptions(preferences.assets, item.asset).map(option => (
                            <option key={option.value} value={option.value}>
                              {option.value}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Direzione">
                        <select
                          className={SELECT_CLASS}
                          value={item.direction}
                          onChange={event =>
                            onUpdateMissed(item.id, {
                              direction: event.target.value as MissedTrade['direction'],
                            })
                          }
                        >
                          <option value="">--</option>
                          <option value="long">Long</option>
                          <option value="short">Short</option>
                        </select>
                      </Field>
                      <Field label="Orario">
                        <Input
                          value={item.time}
                          maxLength={5}
                          inputMode="numeric"
                          placeholder="00:00"
                          className="h-9 text-center text-sm tabular-nums"
                          onChange={event => {
                            const digits = event.target.value.replace(/\D/g, '').slice(0, 4);

                            onUpdateMissed(item.id, {
                              time: digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits,
                            });
                          }}
                        />
                      </Field>
                      <Field label="Setup">
                        <select
                          className={SELECT_CLASS}
                          value={item.setup}
                          onChange={event => onUpdateMissed(item.id, { setup: event.target.value })}
                        >
                          <option value="">Seleziona setup</option>
                          {getMenuOptions(preferences.setups, item.setup).map(option => (
                            <option key={option.value} value={option.value}>
                              {option.value}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="P&L potenziale">
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={item.potentialPnl === 0 ? '' : item.potentialPnl}
                          placeholder="0"
                          className="h-9 text-sm tabular-nums"
                          onChange={event =>
                            onUpdateMissed(item.id, { potentialPnl: Number(event.target.value) || 0 })
                          }
                        />
                      </Field>
                    </div>

                    <Field label="Perché non l’hai presa?">
                      <Textarea
                        value={item.reason}
                        onChange={event => onUpdateMissed(item.id, { reason: event.target.value })}
                        placeholder="Esitazione, fuori orario, regola non rispettata…"
                        className="min-h-[60px] resize-y border-border/70 bg-background/60 text-sm"
                      />
                    </Field>

                    <AttachmentsField
                      value={item.screenshots}
                      onChange={screenshots => onUpdateMissed(item.id, { screenshots })}
                    />

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-loss"
                        onClick={() => onDeleteMissed(item.id)}
                      >
                        <Trash2 className="size-3.5" />
                        Elimina
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Casi studio"
            hint="Operazioni valide che vuoi approfondire."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() =>
                  update({
                    caseStudies: [
                      ...caseStudies,
                      { id: generateId(), title: '', notes: '', screenshots: [] },
                    ],
                  })
                }
              >
                <Plus className="size-3" />
                Aggiungi
              </Button>
            }
          >
            {caseStudies.length === 0 ? (
              <p className="font-sans text-xs text-muted-foreground">Nessun caso studio ancora.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {caseStudies.map(item => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/40 p-3">
                    <div className={cn('grid gap-2.5', trades.length > 0 && 'md:grid-cols-[1fr_240px]')}>
                      <Field label="Titolo">
                        <Input
                          value={item.title}
                          placeholder="Es. Continuation dopo sweep del massimo"
                          className="h-9 text-sm"
                          onChange={event => updateCase(item.id, { title: event.target.value })}
                        />
                      </Field>
                      {trades.length > 0 && (
                        <Field label="Trade collegato">
                          <select
                            className={SELECT_CLASS}
                            value={item.tradeId ?? ''}
                            onChange={event =>
                              updateCase(item.id, { tradeId: event.target.value || undefined })
                            }
                          >
                            <option value="">Nessuno</option>
                            {trades.map(trade => (
                              <option key={trade.id} value={trade.id}>
                                {tradeLabel(trade)}
                              </option>
                            ))}
                          </select>
                        </Field>
                      )}
                    </div>

                    <Field label="Cosa è andato bene e cosa migliorare">
                      <Textarea
                        value={item.notes}
                        onChange={event => updateCase(item.id, { notes: event.target.value })}
                        placeholder="Contesto, entrata, gestione, uscita…"
                        className="min-h-[80px] resize-y border-border/70 bg-background/60 text-sm"
                      />
                    </Field>

                    <AttachmentsField
                      value={item.screenshots}
                      onChange={screenshots => updateCase(item.id, { screenshots })}
                    />

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-loss"
                        onClick={() =>
                          update({ caseStudies: caseStudies.filter(study => study.id !== item.id) })
                        }
                      >
                        <Trash2 className="size-3.5" />
                        Elimina
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
