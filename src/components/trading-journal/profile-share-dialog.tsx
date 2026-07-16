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
import {
  ProfileShareCard,
  type ProfileShareData,
} from './profile-share-card';
import { ShareCardPreview } from './share-card-preview';

interface ProfileShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileShareData;
  streamerMode: boolean;
}

const normalizeFileNamePart = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const getFileName = (traderName: string) => {
  const name = normalizeFileNamePart(traderName);

  return name
    ? `eclipsejournal-profile-card-${name}.png`
    : 'eclipsejournal-profile-card.png';
};

export function ProfileShareDialog({
  open,
  onOpenChange,
  profile,
  streamerMode,
}: ProfileShareDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const exportOptions = {
    backgroundColor: '#05080c',
    cacheBust: true,
    pixelRatio: 2,
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    setIsExporting(true);

    try {
      const dataUrl = await toPng(cardRef.current, exportOptions);
      const link = document.createElement('a');

      link.href = dataUrl;
      link.download = getFileName(profile.traderName);
      link.click();
      toast.success('Immagine salvata');
    } catch {
      toast.error('Impossibile generare la card PNG.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!cardRef.current) return;

    if (!navigator.clipboard?.write || !('ClipboardItem' in window)) {
      toast.error('Copia immagine non supportata da questo browser. Usa Salva come immagine.');
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
      toast.error('Copia immagine non supportata da questo browser. Usa Salva come immagine.');
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
              aria-label="Torna al profilo"
              className="h-10 w-10 shrink-0 rounded-xl border border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-secondary/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-profit/50"
            >
              <ArrowLeft className="size-4" />
            </Button>

            <div className="min-w-0">
              <DialogTitle className="font-mono text-lg">Profilo trader</DialogTitle>
              <DialogDescription>
                Card profilo pronta da salvare o condividere.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="ej-scrollbar flex max-h-[calc(90vh-132px)] flex-col overflow-y-auto overscroll-contain p-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-card/60 p-2.5">
            <ShareCardPreview
              width={760}
              height={760}
              exportRef={cardRef}
            >
              <ProfileShareCard
                profile={profile}
                streamerMode={streamerMode}
                className="w-[760px]"
              />
            </ShareCardPreview>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            disabled={isCopying || isExporting}
            className="gap-2 border-border bg-background/50 text-foreground hover:border-profit/40 hover:bg-secondary/70"
          >
            <Clipboard className="size-4" />
            {isCopying ? 'Copia...' : 'Copia negli appunti'}
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={isExporting || isCopying}
            className="gap-2 bg-profit text-background hover:bg-profit/90"
          >
            <Download className="size-4" />
            {isExporting ? 'Salvataggio...' : 'Salva come immagine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
