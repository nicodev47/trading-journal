import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { saveUploadedImage } from '@/lib/image-store';
import type { ScreenshotData } from '@/lib/types/trade';

interface AddAttachmentButtonProps {
  /** Link typed by the user: with a link the button adds it, without one it opens the file picker. */
  link: string;
  /** Name typed by the user: used when a single file is picked. */
  name: string;
  onAddLink: () => void;
  onUploaded: (screenshots: ScreenshotData[]) => void;
}

const baseName = (fileName: string) => fileName.replace(/\.[^.]+$/, '') || 'Immagine';

/**
 * The single "Aggiungi" button: adds the typed link, or, when there is none, opens the computer's file
 * picker and stores the picked images in the browser.
 */
export function AddAttachmentButton({ link, name, onAddLink, onUploaded }: AddAttachmentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: File[]) => {
    const picked = files;

    if (picked.length === 0) return;

    setBusy(true);

    const saved: ScreenshotData[] = [];

    for (const file of picked) {
      try {
        saved.push(await saveUploadedImage(file, picked.length === 1 && name.trim() ? name.trim() : baseName(file.name)));
      } catch (error) {
        toast.error(error instanceof Error ? `${file.name}: ${error.message}` : `${file.name}: caricamento non riuscito`);
      }
    }

    setBusy(false);

    if (saved.length > 0) onUploaded(saved);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={event => {
          void handleFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1.5 border-border text-xs"
        disabled={busy}
        onClick={() => (link.trim() ? onAddLink() : inputRef.current?.click())}
      >
        <Plus className="size-3" />
        Aggiungi
      </Button>
    </>
  );
}
