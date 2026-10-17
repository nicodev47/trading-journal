'use client';

import { useState } from 'react';
import { ExternalLink, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  /** Shows the files without any way to add or remove them. */
  readOnly?: boolean;
}

/** Links or local images (PNG, JPG, WebP): "Aggiungi" uploads when no link is typed. */
export function AttachmentsField({ value, onChange, readOnly = false }: AttachmentsFieldProps) {
  const [link, setLink] = useState('');

  const addLink = () => {
    const url = link.trim();

    if (!url) return;

    onChange([...value, { url, name: '' }]);
    setLink('');
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((item, index) => (
            <div
              key={`${index}-${item.url.slice(0, 24)}`}
              className="group relative overflow-hidden rounded-lg border border-border bg-background/60"
            >
              <img
                src={getPreviewImageUrl(item.url)}
                alt=""
                className="h-24 w-full object-cover"
                onError={event => {
                  (event.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <span className="truncate font-sans text-[10px] text-muted-foreground">
                  {isDataImage(item.url) ? 'Immagine' : item.url.replace(/^https?:\/\//, '')}
                </span>
                <button
                  type="button"
                  aria-label="Apri allegato"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => void openImageInNewTab(item.url)}
                >
                  <ExternalLink className="size-3" />
                </button>
              </div>
              {!readOnly && (
              <button
                type="button"
                aria-label="Rimuovi allegato"
                className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
                onClick={() => onChange(value.filter((_, position) => position !== index))}
              >
                <X className="size-3" />
              </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
      <div className="flex gap-2">
        <Input
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
          className="h-8 shrink-0 gap-1.5 text-xs"
          disabled={!link.trim() || value.length >= MAX_IMAGES_PER_TRADE}
          onClick={addLink}
        >
          <Plus className="size-3" />
          Aggiungi
        </Button>
      </div>
      )}
    </div>
  );
}
