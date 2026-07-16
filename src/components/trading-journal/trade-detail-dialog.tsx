'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  CUSTOM_TAG_PREFIX,
  TRADE_TAGS,
  VALID_TRADE_SETUPS,
  type ScreenshotData,
  type Trade,
} from '@/lib/types/trade';

interface TradeDetailDialogProps {
  trade: Trade | null;
  streamerMode: boolean;
  onClose: () => void;
  onUpdateTrade?: (id: string, updates: Partial<Trade>) => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

function netPnl(trade: Trade) {
  return trade.pnl - trade.commission;
}

function getTradeDate(trade: Trade) {
  const date = new Date(trade.exitDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTradeTime(trade: Trade) {
  const time =
    trade.exitDate?.split('T')[1] || trade.entryDate?.split('T')[1] || '';
  return time.slice(0, 5) || '—';
}

function normalizeScreenshots(trade: Trade): ScreenshotData[] {
  return (trade.screenshots ?? [])
    .map((screenshot, index) => {
      if (
        typeof screenshot === 'object' &&
        screenshot !== null &&
        'url' in screenshot
      ) {
        return {
          url: screenshot.url,
          name: screenshot.name || `Allegato ${index + 1}`,
        };
      }

      if (typeof screenshot === 'string') {
        try {
          const parsed = JSON.parse(screenshot) as Partial<ScreenshotData>;
          if (parsed && typeof parsed.url === 'string') {
            return {
              url: parsed.url,
              name: parsed.name || `Allegato ${index + 1}`,
            };
          }
        } catch {
          // Plain URLs and base64 images are valid legacy values.
        }

        return { url: screenshot, name: `Allegato ${index + 1}` };
      }

      return null;
    })
    .filter((screenshot): screenshot is ScreenshotData =>
      Boolean(screenshot?.url)
    );
}

function getImageUrl(url: string) {
  if (url.startsWith('data:image/')) return url;
  if (url.includes('s3.tradingview.com/snapshots')) return url;

  const tradingViewMatch = url.match(
    /tradingview\.com\/x\/([A-Za-z0-9]+)/
  );
  return tradingViewMatch
    ? `https://s3.tradingview.com/snapshots/t/${tradingViewMatch[1]}.png`
    : url;
}

function canPreviewImage(url: string) {
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    url.startsWith('data:image/') ||
    url.startsWith('blob:') ||
    url.includes('s3.tradingview.com/snapshots') ||
    /tradingview\.com\/x\/[A-Za-z0-9]+/.test(url) ||
    /\.(png|jpe?g|webp|gif|avif|svg)$/.test(cleanUrl)
  );
}

function getLinkLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.startsWith('data:image/') ? 'Immagine locale' : 'Link allegato';
  }
}

function getTagLabel(value: string) {
  const standardTag = TRADE_TAGS.find((tag) => tag.value === value);
  if (standardTag) {
    return `${standardTag.emoji} ${standardTag.label}`;
  }
  return value.startsWith(CUSTOM_TAG_PREFIX)
    ? value.slice(CUSTOM_TAG_PREFIX.length)
    : value;
}

function formatCurrency(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

function EconomicValue({
  value,
  streamerMode,
  className,
}: {
  value: number;
  streamerMode: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        value > 0 && 'text-profit',
        value < 0 && 'text-loss',
        value === 0 && 'text-muted-foreground',
        className
      )}
    >
      {streamerMode ? '******' : formatCurrency(value)}
    </span>
  );
}

function DetailCard({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/80 bg-background/35 p-3',
        className
      )}
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 font-mono text-xs text-foreground">{children}</div>
    </div>
  );
}

function AttachmentItem({
  screenshot,
  index,
}: {
  screenshot: ScreenshotData;
  index: number;
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const showPreview = canPreviewImage(screenshot.url) && !previewFailed;
  const name = screenshot.name || `Allegato ${index + 1}`;

  if (!showPreview) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5 transition-colors hover:bg-secondary/40">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs font-semibold text-foreground">
            {name}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {getLinkLabel(screenshot.url)}
          </p>
        </div>
        <a
          href={screenshot.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 font-mono text-[10px] text-foreground transition-colors hover:border-profit/40 hover:text-profit"
        >
          Apri <ExternalLink className="size-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/70">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <span className="truncate text-xs text-foreground">{name}</span>
        <a
          href={screenshot.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs text-profit hover:underline"
        >
          Apri <ExternalLink className="size-3" />
        </a>
      </div>
      <img
        src={getImageUrl(screenshot.url)}
        alt={name}
        className="max-h-64 w-full bg-background/40 object-contain"
        onError={() => setPreviewFailed(true)}
      />
    </div>
  );
}

export function TradeDetailDialog({
  trade,
  streamerMode,
  onClose,
  onUpdateTrade,
  showBackButton = false,
  onBack,
}: TradeDetailDialogProps) {
  const [setupDraft, setSetupDraft] = useState('');
  const [savedSetup, setSavedSetup] = useState('');

  useEffect(() => {
    const setup = trade?.strategy?.trim() ?? '';
    setSetupDraft(setup);
    setSavedSetup(setup);
  }, [trade?.id, trade?.strategy]);

  if (!trade) return null;

  const date = getTradeDate(trade);
  const screenshots = normalizeScreenshots(trade);
  const tags = trade.tags ?? [];
  const canEditSetup = Boolean(onUpdateTrade && !trade.strategy?.trim());
  const normalizedSetupDraft = setupDraft.trim();
  const isSetupDirty =
    canEditSetup &&
    normalizedSetupDraft.length > 0 &&
    normalizedSetupDraft !== savedSetup;

  const saveSetup = () => {
    if (!onUpdateTrade || !isSetupDirty) return;

    onUpdateTrade(trade.id, { strategy: normalizedSetupDraft });
    setSavedSetup(normalizedSetupDraft);
  };

  const handleClose = () => {
    saveSetup();
    onClose();
  };

  const handleBack = () => {
    saveSetup();
    onBack?.();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-4xl gap-0 overflow-hidden border-border bg-card p-0 sm:max-h-[88vh] sm:w-[94vw]">
        <DialogHeader className="border-b border-border px-4 py-3.5 pr-12 text-left sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center gap-2">
            {showBackButton && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl border border-border bg-background/60 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-profit/50"
                onClick={handleBack}
                aria-label="Torna alla lista trade"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="font-mono text-base font-semibold tracking-wide">
              Dettaglio trade
            </DialogTitle>
            {trade.isFavorite && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 font-mono text-[10px] text-amber-300">
                <Star className="size-3 fill-current" />
                Preferito
              </span>
            )}
          </div>
          <DialogDescription className="font-mono text-xs">
            Tutti i dati registrati per l’operazione selezionata.
          </DialogDescription>
        </DialogHeader>

        <div className="ej-scrollbar max-h-[calc(92dvh-8rem)] overflow-y-auto overscroll-contain px-4 py-4 sm:max-h-none sm:px-6 sm:py-5">
          <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:gap-3 md:grid-cols-3">
            <DetailCard label="Data">
              {date
                ? date.toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : '—'}
            </DetailCard>
            <DetailCard label="P&L">
              <EconomicValue
                value={netPnl(trade)}
                streamerMode={streamerMode}
                className="font-semibold"
              />
            </DetailCard>
            <DetailCard label="Direzione">
              <span className="capitalize">{trade.direction || '—'}</span>
            </DetailCard>
            <DetailCard label="Setup">
              {canEditSetup ? (
                <select
                  value={setupDraft}
                  onChange={(event) => setSetupDraft(event.target.value)}
                  className="ej-filter-select h-9 w-full rounded-lg border border-border bg-background/70 px-3 font-mono text-xs text-foreground outline-none transition-colors focus:border-profit/60"
                >
                  <option value="">Seleziona setup</option>
                  {VALID_TRADE_SETUPS.map((setup) => (
                    <option key={setup} value={setup}>
                      {setup}
                    </option>
                  ))}
                </select>
              ) : (
                trade.strategy?.trim() || '—'
              )}
            </DetailCard>
            <DetailCard label="Orario">{getTradeTime(trade)}</DetailCard>
            <DetailCard label="Asset">
              {trade.pair?.trim() || '—'}
            </DetailCard>
          </div>

          <DetailCard label="Note complete" className="mt-3">
            <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
              {trade.notes?.trim() || '—'}
            </p>
          </DetailCard>

          <DetailCard label="Tags" className="mt-3">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-teal-300/25 bg-teal-300/10 px-2.5 py-1.5 font-mono text-xs text-teal-100"
                  >
                    {getTagLabel(tag)}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </DetailCard>

          <DetailCard
            label="Link TradingView / Google Drive / immagini"
            className="mt-3"
          >
            {screenshots.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {screenshots.map((screenshot, index) => (
                  <AttachmentItem
                    key={`${screenshot.url}-${index}`}
                    screenshot={screenshot}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </DetailCard>
        </div>

        <DialogFooter className="border-t border-border px-4 py-3.5 sm:px-6 sm:py-4 max-sm:[&_button]:w-full">
          {canEditSetup && (
            <Button
              type="button"
              onClick={saveSetup}
              disabled={!isSetupDirty}
              className="rounded-[10px] bg-profit text-background hover:bg-profit/90"
            >
              Salva
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="rounded-[10px]"
            onClick={handleClose}
          >
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
