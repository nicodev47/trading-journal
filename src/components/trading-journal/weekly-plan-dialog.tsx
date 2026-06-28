'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, ImageIcon, Clipboard, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeeklyPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  weekKey: string;
  weekLabel: string;
  initialData?: WeeklyPlanData;
  onSave: (data: WeeklyPlanData) => void;
}

export interface WeeklyPlanData {
  weekKey: string;
  approach: 'intraday' | 'swing' | '';
  calendarScreenshots: string[];
  notes: string;
}

export function WeeklyPlanDialog({
  isOpen,
  onClose,
  weekKey,
  weekLabel,
  initialData,
  onSave,
}: WeeklyPlanDialogProps) {
  const [approach, setApproach] = useState<'intraday' | 'swing' | ''>(initialData?.approach || '');
  const [screenshots, setScreenshots] = useState<string[]>(initialData?.calendarScreenshots || []);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (isOpen) {
      setApproach(initialData?.approach || '');
      setScreenshots(initialData?.calendarScreenshots || []);
      setNotes(initialData?.notes || '');
    }
  }, [isOpen, initialData]);

  const handleFileCarica = useCallback((files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => {
          const dataUrl = e.target?.result as string;
          setScreenshots(prev => [...prev, dataUrl]);
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const [pasteHint, setIncollaHint] = useState(false);

  const handleIncollaClick = useCallback(() => {
    // Show hint to user since programmatic clipboard access is blocked
    setIncollaHint(true);
    // Focus on the drop zone to capture keyboard paste
    dropZoneRef.current?.focus();
    setTimeout(() => setIncollaHint(false), 3000);
  }, []);

  // Handle paste events globally when dialog is open
  useEffect(() => {
    if (!isOpen) return;

    const handleIncollaEvent = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = evt => {
              const dataUrl = evt.target?.result as string;
              setScreenshots(prev => [...prev, dataUrl]);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    document.addEventListener('paste', handleIncollaEvent);
    return () => document.removeEventListener('paste', handleIncollaEvent);
  }, [isOpen]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileCarica(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const openScreenshotInNewTab = (src: string) => {
    // For base64 images, we need to open them in a new tab
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Economic Calendar Screenshot</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a1a; }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            <img src="${src}" alt="Economic Calendar Screenshot" />
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const handleSave = () => {
    onSave({
      weekKey,
      approach,
      calendarScreenshots: screenshots,
      notes,
    });
    onClose();
  };

  const handleClear = () => {
    setApproach('');
    setScreenshots([]);
    setNotes('');
    // Save cleared state immediately
    onSave({
      weekKey,
      approach: '',
      calendarScreenshots: [],
      notes: '',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="ej-scrollbar max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-2xl overflow-y-auto overscroll-contain border-border bg-card sm:w-[95vw] sm:max-h-[90vh]">
        <DialogHeader className="border-b border-border px-4 py-3.5 text-left sm:px-6 sm:py-4">
          <DialogTitle className="font-mono text-base font-medium tracking-wide">
            Piano settimanale - {weekLabel}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Imposta approccio e piano di trading per questa settimana
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
          {/* Approccio trading - with bordered buttons */}
          <div className="flex flex-col gap-3">
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Approccio trading
            </Label>
            <div className="flex flex-col gap-2 min-[420px]:flex-row">
              <button
                type="button"
                onClick={() => setApproach(approach === 'intraday' ? '' : 'intraday')}
                className={cn(
                  'rounded-md border px-4 py-2 font-mono text-sm transition-colors max-[419px]:w-full',
                  approach === 'intraday'
                    ? 'border-profit bg-profit text-background'
                    : 'border-border bg-background text-foreground hover:bg-secondary'
                )}
              >
                Intraday
              </button>
              <button
                type="button"
                onClick={() => setApproach(approach === 'swing' ? '' : 'swing')}
                className={cn(
                  'rounded-md border px-4 py-2 font-mono text-sm transition-colors max-[419px]:w-full',
                  approach === 'swing'
                    ? 'border-profit bg-profit text-background'
                    : 'border-border bg-background text-foreground hover:bg-secondary'
                )}
              >
                Swing
              </button>
            </div>
          </div>

          {/* Screenshot calendario economico */}
          <div className="flex flex-col gap-3">
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Screenshot calendario economico
            </Label>
            
            {/* Drop Zone */}
            <div
              ref={dropZoneRef}
              tabIndex={0}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                'flex min-h-[100px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-colors outline-none',
                isDragging ? 'border-profit bg-profit/5' : 'border-border',
                'focus:border-profit focus:ring-1 focus:ring-profit'
              )}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <ImageIcon className="size-5" />
                <span className="text-sm">Rilascia qui le immagini oppure</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 border-border"
                >
                  <Plus className="size-4" />
                  Carica
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleIncollaClick}
                  className="gap-2 border-border"
                >
                  <Clipboard className="size-4" />
                  Incolla
                </Button>
              </div>
              {pasteHint ? (
                <p className="text-xs text-profit">Ora premi Ctrl+V (o Cmd+V) per incollare!</p>
              ) : (
                <p className="text-xs text-muted-foreground">Premi Ctrl+V per incollare dagli appunti</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={e => handleFileCarica(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Screenshot Previews */}
            {screenshots.length > 0 && (
              <div className="flex flex-col gap-3">
                {screenshots.map((src, index) => (
                  <div key={index} className="relative rounded-lg border border-border bg-background p-2">
                    <img
                      src={src}
                      alt={`Calendario economico ${index + 1}`}
                      className="w-full rounded object-contain"
                    />
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Immagine {index + 1}</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openScreenshotInNewTab(src)}
                          className="flex items-center gap-1 text-foreground hover:text-profit"
                        >
                          Apri <ExternalLink className="size-3" />
                        </button>
                        <button
                          onClick={() => removeScreenshot(index)}
                          className="flex items-center gap-1 text-loss hover:text-loss/80"
                        >
                          <X className="size-4" /> Rimuovi
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Notes */}
          <div className="flex flex-col gap-3">
            <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Note piano settimanale
            </Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Qual è il piano per questa settimana? Livelli chiave, news, strumenti da monitorare..."
              className="min-h-[150px] resize-y border-border bg-background font-sans text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button
            variant="outline"
            onClick={handleClear}
            className="border-loss/50 text-loss hover:bg-loss/10"
          >
            Svuota piano
          </Button>
          <Button
            onClick={handleSave}
            className="bg-profit text-background hover:bg-profit/90"
          >
            Salva piano
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
