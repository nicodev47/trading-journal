'use client';

import { useRef, useState } from 'react';
import { ExternalLink, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MAX_IMAGES_PER_TRADE,
  fileToCompressedDataUrl,
  getPreviewImageUrl,
  isDataImage,
  openImageInNewTab,
} from '@/lib/image-upload';
import type { ScreenshotData } from '@/lib/types/trade';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface AttachmentsFieldProps {
  value: ScreenshotData[];
  onChange: (value: ScreenshotData[]) => void;
}

/** Links or local images (PNG, JPG, WebP): "Aggiungi" uploads when no link is typed. */
export function AttachmentsField({ value, onChange }: AttachmentsFieldProps) {
  const [link, setLink] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addLink = () => {
    const url = link.trim();

    if (!url) return;

    onChange([...value, { url, name: '' }]);
    setLink('');
  };

  const addFiles = async (files: File[]) => {
    const images = files.filter(file => ALLOWED_TYPES.includes(file.type));

    if (images.length < files.length) {
      toast.error('Sono supportati solo file PNG, JPG o WebP');
    }

    const added: ScreenshotData[] = [];

    for (const file of images) {
      if (value.length + added.length >= MAX_IMAGES_PER_TRADE) {
        toast.error(`Puoi allegare al massimo ${MAX_IMAGES_PER_TRADE} immagini`);
        break;
      }

      try {
        added.push({ url: await fileToCompressedDataUrl(file), name: '' });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Impossibile caricare l’immagine');
      }
    }

    if (added.length > 0) onChange([...value, ...added]);
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
              <button
                type="button"
                aria-label="Rimuovi allegato"
                className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
                onClick={() => onChange(value.filter((_, position) => position !== index))}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={link}
          onChange={event => setLink(event.target.value)}
          onKeyDown={event => event.key === 'Enter' && addLink()}
          placeholder="Link di TradingView"
          className="h-8 border-border/70 bg-background/60 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs"
          disabled={!link.trim() && value.length >= MAX_IMAGES_PER_TRADE}
          onClick={() => (link.trim() ? addLink() : fileRef.current?.click())}
        >
          <Plus className="size-3" />
          Aggiungi
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={event => {
            void addFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
