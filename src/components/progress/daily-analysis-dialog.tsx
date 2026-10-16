'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { generateId } from '@/lib/calculations';
import type { DailyAnalysis, ScreenshotData, Trade } from '@/lib/types/trade';
import { AttachmentsField } from './attachments-field';
import type { AccountChip } from '@/components/trading-journal/trade-detail-dialog';
import { TradeDetailDialog } from '@/components/trading-journal/trade-detail-dialog';
import { TradeGroupContent } from '@/components/trading-journal/trade-group-detail-dialog';

interface DailyAnalysisDialogProps {
  open: boolean;
  date: string;
  entry?: DailyAnalysis;
  trades: Trade[];
  /** Prop accounts a trade was executed on. */
  getAccounts: (trade: Trade) => AccountChip[];
  onClose: () => void;
  onSave: (entry: DailyAnalysis) => void;
  onDelete: (date: string) => void;
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

export function DailyAnalysisDialog({
  open,
  date,
  entry,
  trades,
  getAccounts,
  onClose,
  onSave,
  onDelete,
}: DailyAnalysisDialogProps) {
  const { streamerMode } = useStreamerMode();
  const [analysis, setAnalysis] = useState('');
  const [observations, setObservations] = useState('');
  const [openedTrade, setOpenedTrade] = useState<Trade | null>(null);
  const [attachments, setAttachments] = useState<ScreenshotData[]>([]);
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
    setAttachments(entry?.attachments ?? []);
  }, [open, date, entry]);

  type Draft = { analysis: string; observations: string; attachments: ScreenshotData[] };
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
      !next.analysis.trim() && !next.observations.trim() && next.attachments.length === 0;

    if (empty) {
      remove(day);
      return;
    }

    const now = new Date().toISOString();

    save({
      id: current?.id ?? generateId(),
      date: day,
      ...next,
      caseStudies: current?.caseStudies ?? [],
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    });
  };

  const persist = (next: Draft) => {
    pending.current = next;

    if (timer.current) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(flush, 500);
  };

  const update = (patch: Partial<Draft>) => {
    const next = { analysis, observations, attachments, ...patch };

    if (patch.analysis !== undefined) setAnalysis(patch.analysis);
    if (patch.observations !== undefined) setObservations(patch.observations);
    if (patch.attachments !== undefined) setAttachments(patch.attachments);

    persist(next);
  };

  // Never lose the last keystrokes when the page is left.
  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasTrades = trades.length > 0;
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const analysisCard = (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5 sm:px-6 sm:py-4">
        <DialogTitle className="font-sans text-base capitalize">{formatDate(date)}</DialogTitle>
        <DialogDescription className="mt-0.5 font-sans text-xs">
          {hasTrades
            ? 'Qui scrivi l’analisi della giornata: si salva da solo.'
            : 'Nessun trade eseguito questo giorno. Qui scrivi tutto quello che c’è dietro: si salva da solo.'}
        </DialogDescription>
      </div>

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

        <Section title="Carica file" hint="Grafici, screenshot o link di TradingView della giornata.">
          <AttachmentsField value={attachments} onChange={value => update({ attachments: value })} />
        </Section>
      </div>
    </div>
  );

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
        className={
          hasTrades
            ? 'ej-scrollbar flex max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-[860px] flex-col gap-4 overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:w-[94vw]'
            : 'ej-scrollbar max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-3xl gap-0 overflow-y-auto p-0 sm:w-[92vw]'
        }
        onOpenAutoFocus={event => event.preventDefault()}
      >
        {hasTrades && (
          <div className="shrink-0 overflow-hidden rounded-2xl border border-border bg-card">
            <TradeGroupContent
              title={`Trade del ${dateLabel}`}
              subtitle="Operazioni registrate nella Execution Map."
              trades={trades}
              columnHeaders
              getAccounts={getAccounts}
              onOpenTrade={trade => setOpenedTrade(trade)}
            />
          </div>
        )}

        {hasTrades ? <div className="shrink-0">{analysisCard}</div> : analysisCard}
      </DialogContent>

    </Dialog>
  );
}
