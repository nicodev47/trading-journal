import { useRef, useState } from 'react';
import { ArrowLeft, Clipboard, Download } from 'lucide-react';
import { toBlob, toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import type { Trade } from '@/lib/types/trade';
import { ShareCardPreview } from './share-card-preview';
import { TradeShareCard } from './trade-share-card';

interface TradeShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Trade | null;
  date: string;
  initialHandle?: string;
}

const normalizeHandleInput = (value: string) => value.trim().replace(/^@+/, '');

const getOperationalDate = (trade: Trade, fallbackDate: string) => {
  const rawDate = trade.exitDate || trade.entryDate || fallbackDate;
  const datePart = rawDate.split('T')[0] || fallbackDate;

  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : fallbackDate;
};

const formatDialogDate = (trade: Trade, fallbackDate: string) => {
  const [year, month, day] = getOperationalDate(trade, fallbackDate)
    .split('-')
    .map(Number);

  if (!year || !month || !day) {
    return fallbackDate;
  }

  return new Date(year, month - 1, day).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const getFileName = (trade: Trade, fallbackDate: string) => {
  const asset = (trade.pair || 'asset')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
  const netPnl = trade.pnl - (trade.commission || 0);
  const result = netPnl > 0 ? 'profit' : netPnl < 0 ? 'loss' : 'breakeven';

  return `eclipsejournal-trade-${getOperationalDate(trade, fallbackDate)}-${asset}-${result}.png`;
};

export function TradeShareDialog({
  open,
  onOpenChange,
  trade,
  date,
  initialHandle = '',
}: TradeShareDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { streamerMode } = useStreamerMode();
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const profileHandle = normalizeHandleInput(initialHandle);

  const exportOptions = {
    backgroundColor: '#05080c',
    cacheBust: true,
    pixelRatio: 2,
  };

  const handleDownload = async () => {
    if (!trade || !cardRef.current) return;

    setIsExporting(true);

    try {
      const dataUrl = await toPng(cardRef.current, exportOptions);
      const link = document.createElement('a');

      link.href = dataUrl;
      link.download = getFileName(trade, date);
      link.click();
      toast.success('Immagine salvata');
    } catch {
      toast.error('Impossibile generare la card PNG.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!trade || !cardRef.current) return;

    if (!navigator.clipboard?.write || !('ClipboardItem' in window)) {
      toast.error('Copia immagine non supportata da questo browser. Usa Save as Image.');
      return;
    }

    setIsCopying(true);

    try {
      const blob = await toBlob(cardRef.current, exportOptions);

      if (!blob) {
        throw new Error('Missing image blob');
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      toast.success('Copiata negli appunti');
    } catch {
      toast.error('Copia immagine non supportata da questo browser. Usa Save as Image.');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-[calc(100vw-48px)] max-w-[920px] overflow-hidden border-border bg-background p-0"
        overlayClassName="bg-black/80 backdrop-blur-sm"
      >
        <DialogHeader className="border-b border-border px-4 py-3">
          <div className="flex items-start gap-3 pr-8">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Torna al trade"
              className="h-10 w-10 shrink-0 rounded-xl border border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-secondary/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-profit/50"
            >
              <ArrowLeft className="size-4" />
            </Button>

            <div className="min-w-0">
              <DialogTitle className="font-mono text-lg">Trade Recap</DialogTitle>
              <DialogDescription>
                {trade ? formatDialogDate(trade, date) : 'Genera una card condivisibile del trade.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="ej-scrollbar flex max-h-[calc(90vh-132px)] flex-col overflow-y-auto overscroll-contain p-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-card/60 p-2.5">
            {trade && (
              <ShareCardPreview
                width={840}
                height={472.5}
                exportRef={cardRef}
              >
                <TradeShareCard
                  trade={trade}
                  date={date}
                  handle={profileHandle}
                  streamerMode={streamerMode}
                  className="w-[840px]"
                />
              </ShareCardPreview>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            disabled={!trade || isCopying || isExporting}
            className="gap-2 border-border bg-background/50 text-foreground hover:border-profit/40 hover:bg-secondary/70"
          >
            <Clipboard className="size-4" />
            {isCopying ? 'Copia...' : 'Copy to Clipboard'}
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={!trade || isExporting || isCopying}
            className="gap-2 bg-profit text-background hover:bg-profit/90"
          >
            <Download className="size-4" />
            {isExporting ? 'Salvataggio...' : 'Save as Image'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
