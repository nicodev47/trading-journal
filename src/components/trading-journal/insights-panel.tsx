'use client';

import { useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/preferences-context';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { buildInsights, type Insight, type InsightTopic, type Segment } from '@/lib/insights';
import type { Trade } from '@/lib/types/trade';
import { cn } from '@/lib/utils';

const TOPICS: Record<InsightTopic, { label: string; icon: LucideIcon }> = {
  setup: { label: 'Setup', icon: Target },
  orari: { label: 'Orari', icon: Clock },
  giorni: { label: 'Giorni', icon: CalendarDays },
  mesi: { label: 'Mesi', icon: CalendarDays },
  serie: { label: 'Serie', icon: Zap },
  rischio: { label: 'Rischio', icon: Scale },
  direzione: { label: 'Direzione', icon: TrendingUp },
};

function Sentence({ segments, hideMoney }: { segments: Segment[]; hideMoney: boolean }) {
  return (
    <>
      {segments.map((segment, index) => {
        if (typeof segment === 'string') return <span key={index}>{segment}</span>;

        const isMoney = /USD$/.test(segment.text);

        return (
          <span
            key={index}
            className={cn(
              'font-semibold tabular-nums',
              segment.tone === 'profit' && 'text-profit',
              segment.tone === 'loss' && 'text-loss',
              segment.tone === 'strong' && 'text-foreground'
            )}
          >
            {hideMoney && isMoney ? '******' : segment.text}
          </span>
        );
      })}
    </>
  );
}

interface InsightsPanelProps {
  trades: Trade[];
  onOpenGroup: (title: string, subtitle: string, trades: Trade[]) => void;
}

/** Plain findings computed from the user's own trades, one line each. */
export function InsightsPanel({ trades, onOpenGroup }: InsightsPanelProps) {
  const { preferences } = usePreferences();
  const { streamerMode } = useStreamerMode();
  const insights = useMemo(
    () => buildInsights(trades, preferences.windows),
    [trades, preferences.windows]
  );

  const topics = Object.keys(TOPICS).filter(topic =>
    insights.some(insight => insight.topic === topic)
  ) as InsightTopic[];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.08]">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-sans text-[15px] font-semibold tracking-tight">
            Cosa dicono i tuoi dati
          </h2>
          <p className="font-sans text-xs text-muted-foreground">
            Dati riportati dalle tue operazioni del periodo.
          </p>
        </div>
      </div>

      {insights.length === 0 ? (
        <p className="px-5 py-10 text-center font-sans text-sm text-muted-foreground">
          Registra qualche operazione per ricevere osservazioni sul tuo andamento.
        </p>
      ) : (
        <div className="divide-y divide-border/60">
          {topics.map(topic => {
            const { label, icon: Icon } = TOPICS[topic];

            return (
              <section key={topic} className="px-4 py-4 sm:px-5">
                <div className="mb-3 flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon className="size-3.5" />
                  {label}
                </div>

                <ul className="flex flex-col gap-3.5">
                  {insights
                    .filter((insight: Insight) => insight.topic === topic)
                    .map(insight => (
                      <li key={insight.id} className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                            <Sentence segments={insight.segments} hideMoney={streamerMode} />
                          </p>
                        </div>

                        {insight.trades && insight.trades.length > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 shrink-0 rounded-lg px-3 text-xs"
                            onClick={() =>
                              onOpenGroup(
                                insight.openTitle ?? label,
                                'Operazioni collegate a questa osservazione.',
                                insight.trades ?? []
                              )
                            }
                          >
                            Apri
                          </Button>
                        )}
                      </li>
                    ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

    </div>
  );
}
