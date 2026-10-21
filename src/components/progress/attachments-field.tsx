'use client';

import { useState } from 'react';
import { Check, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  MAX_IMAGES_PER_TRADE,
  getPreviewImageUrl,
  isDataImage,
  openImageInNewTab,
} from '@/lib/image-upload';
import type { ScreenshotData } from '@/lib/types/trade';

interface AttachmentsFieldProps {
  value: ScreenshotData[];
  onChange: (value: ScreenshotData[]) => void;
  /** Shows the files without any way to add, rename or remove them. */
  readOnly?: boolean;
}

/**
 * Links to charts and images, added the same way as in the trade editor:
 * a name, the link and "Aggiungi"; each file can be renamed or removed.
 */
export function AttachmentsField({ value, onChange, readOnly = false }: AttachmentsFieldProps) {
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [editing, setEditing] = useState<{ index: number; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<number | null>(null);

  const addLink = () => {
    const url = link.trim();

    if (!url || value.length >= MAX_IMAGES_PER_TRADE) return;

    onChange([...value, { url, name: name.trim() }]);
    setName('');
    setLink('');
  };

  const saveName = () => {
    if (!editing) return;

    const nextName = editing.name.trim() || value[editing.index]?.name?.trim() || 'Link';

    onChange(value.map((item, index) => (index === editing.index ? { ...item, name: nextName } : item)));
    setEditing(null);
  };

  const confirmDelete = () => {
    if (toDelete === null) return;

    onChange(value.filter((_, index) => index !== toDelete));

    if (editing?.index === toDelete) setEditing(null);

    setToDelete(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <div className="flex flex-col gap-3">
          {value.map((item, index) => {
            const isEditing = editing?.index === index;

            return (
              <div
                key={`${index}-${item.url.slice(0, 24)}`}
                className="flex flex-col gap-2 rounded-lg border border-border/80 bg-card/60 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  {isEditing ? (
                    <Input
                      autoFocus
                      value={editing.name}
                      onChange={event => setEditing({ index, name: event.target.value })}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          saveName();
                        }

                        if (event.key === 'Escape') {
                          event.preventDefault();
                          event.stopPropagation();
                          setEditing(null);
                        }
                      }}
                      aria-label="Modifica nome link"
                      className="h-8 min-w-0 flex-1 border-border/70 bg-background/60 font-sans tabular-nums text-xs"
                    />
                  ) : (
                    <span className="min-w-0 truncate font-sans tabular-nums text-xs font-medium text-foreground">
                      {item.name || 'Link'}
                    </span>
                  )}

                  {!readOnly && (
                    <div className="flex shrink-0 items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={saveName}
                            aria-label="Salva nome link"
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-profit/20 bg-profit/5 px-2 font-sans tabular-nums text-[10px] text-muted-foreground transition-colors hover:border-highlight/40 hover:bg-primary/10 hover:text-highlight"
                          >
                            <Check className="size-3" />
                            Salva
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            aria-label="Annulla modifica nome link"
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background/70 px-2 font-sans tabular-nums text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            <X className="size-3" />
                            Annulla
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditing({ index, name: item.name || 'Link' })}
                          aria-label="Modifica nome link"
                          className="rounded-lg border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-highlight/30 hover:bg-primary/10 hover:text-highlight"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setToDelete(index)}
                        aria-label="Elimina link"
                        className="rounded-lg border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {!isDataImage(item.url) && (
                  <span className="truncate text-xs text-muted-foreground">{item.url}</span>
                )}

                <div className="relative overflow-hidden rounded border border-border">
                  <img
                    src={getPreviewImageUrl(item.url)}
                    alt={item.name || `Allegato ${index + 1}`}
                    className="w-full object-contain"
                    onError={event => {
                      (event.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>

                <div className="flex items-center justify-end text-xs">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={event => {
                      if (isDataImage(item.url)) {
                        event.preventDefault();
                        void openImageInNewTab(item.url);
                      }
                    }}
                    className="flex items-center gap-1 text-foreground hover:text-highlight"
                  >
                    Apri <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr_auto]">
            <Input
              type="text"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Nome del file (es. 15m)"
              className="h-8 border-border/70 bg-background/60 text-sm"
            />
            <Input
              type="url"
              value={link}
              onChange={event => setLink(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && addLink()}
              placeholder="Link di TradingView o Google Drive"
              className="h-8 border-border/70 bg-background/60 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 border-border text-xs"
              disabled={!link.trim() || value.length >= MAX_IMAGES_PER_TRADE}
              onClick={addLink}
            >
              <Plus className="size-3" />
              Aggiungi
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Dai un nome al file, incolla il link di TradingView / Google Drive e premi “Aggiungi”
          </p>
        </div>
      )}

      <Dialog open={toDelete !== null} onOpenChange={open => !open && setToDelete(null)}>
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-[460px] border-border bg-card">
          <DialogHeader>
            <DialogTitle>Eliminare questa immagine?</DialogTitle>
            <DialogDescription>Il link all&apos;immagine verrà rimosso.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:[&_button]:w-full">
            <Button type="button" variant="outline" onClick={() => setToDelete(null)}>
              Annulla
            </Button>
            <Button type="button" className="bg-loss text-white hover:bg-loss/90" onClick={confirmDelete}>
              Elimina immagine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
