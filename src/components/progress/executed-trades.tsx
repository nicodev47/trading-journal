'use client';

import { ExternalLink } from 'lucide-react';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { getPreviewImageUrl, openImageInNewTab } from '@/lib/image-upload';
import {
  CUSTOM_TAG_PREFIX,
  TRADE_TAGS,
  type ScreenshotData,
  type Trade,
} from '@/lib/types/trade';
import { cn } from '@/lib/utils';

const tagLabel = (value: string) => {
  const standard = TRADE_TAGS.find(tag => tag.value === value);

  if (standard) return `${standard.emoji} ${standard.label}`;

  return value.startsWith(CUSTOM_TAG_PREFIX) ? value.slice(CUSTOM_TAG_PREFIX.length) : value;
};

const toScreenshot = (item: Trade['screenshots'][number]): ScreenshotData | null => {
  if (typeof item === 'string') return item ? { url: item, name: '' } : null;

  return item?.url ? item : null;
};

const timeOf = (trade: Trade) => (trade.exitDate.split('T')[1] ?? '').slice(0, 5);

/** Trades entered from the dashboard calendar, with the analysis already written on each. */
export function ExecutedTrades({ trades }: { trades: Trade[] }) {
  const { streamerMode } = useStreamerMode();

  if (trades.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-background/30 p-3.5 sm:p-4">
      <div>
        <h3 className="font-sans text-[13px] font-semibold tracking-tight">Trade eseguiti</h3>
        <p className="mt-0.5 font-sans text-xs text-muted-foreground">
          Inseriti dal calendario della dashboard, con l’analisi già fatta.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {trades.map(trade => {
          const net = trade.pnl - trade.commission;
          const shots = (trade.screenshots ?? []).map(toScreenshot).filter(Boolean) as ScreenshotData[];

          return (
            <div key={trade.id} className="flex flex-col gap-2.5 rounded-lg border border-border/70 bg-background/40 p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs">
                <span className="font-semibold">{trade.pair || '—'}</span>
                <span className="uppercase text-muted-foreground">{trade.direction}</span>
                {timeOf(trade) && timeOf(trade) !== '00:00' && (
                  <span className="tabular-nums text-muted-foreground">{timeOf(trade)}</span>
                )}
                {trade.strategy && (
                  <span className="rounded-full border border-border bg-white/[0.05] px-2 py-0.5 text-[10px] text-muted-foreground">
                    {trade.strategy}
                  </span>
                )}
                <span
                  className={cn(
                    'ml-auto font-semibold tabular-nums',
                    net > 0 ? 'text-profit' : net < 0 ? 'text-loss' : 'text-muted-foreground'
                  )}
                >
                  {streamerMode ? '******' : `${net > 0 ? '+' : ''}${net.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                </span>
              </div>

              {trade.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {trade.tags.map(tag => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/80 bg-secondary/40 px-2 py-0.5 font-sans text-[10px] text-muted-foreground"
                    >
                      {tagLabel(tag)}
                    </span>
                  ))}
                </div>
              )}

              {trade.notes?.trim() && (
                <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{trade.notes}</p>
              )}

              {shots.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {shots.map((shot, index) => (
                    <button
                      key={`${index}-${shot.url.slice(0, 24)}`}
                      type="button"
                      onClick={() => void openImageInNewTab(shot.url)}
                      className="group relative overflow-hidden rounded-lg border border-border bg-background/60 text-left"
                    >
                      <img
                        src={getPreviewImageUrl(shot.url)}
                        alt=""
                        className="h-24 w-full object-cover"
                        onError={event => {
                          (event.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="flex items-center justify-between gap-2 px-2 py-1 font-sans text-[10px] text-muted-foreground">
                        <span className="truncate">{shot.name || 'Allegato'}</span>
                        <ExternalLink className="size-3 shrink-0" />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!trade.notes?.trim() && shots.length === 0 && (!trade.tags || trade.tags.length === 0) && (
                <p className="font-sans text-xs text-muted-foreground">Nessuna analisi scritta su questo trade.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
