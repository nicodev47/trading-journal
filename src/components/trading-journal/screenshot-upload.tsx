'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, ZoomIn } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ScreenshotUploadProps {
  screenshots: string[];
  onChange: (screenshots: string[]) => void;
  maxScreenshots?: number;
}

export function ScreenshotUpload({
  screenshots,
  onChange,
  maxScreenshots = 5,
}: ScreenshotUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = maxScreenshots - screenshots.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onChange([...screenshots, base64]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeScreenshot = (index: number) => {
    onChange(screenshots.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {screenshots.map((screenshot, index) => (
          <div
            key={index}
            className="group relative size-20 overflow-hidden rounded-lg border border-border"
          >
            <img
              src={screenshot}
              alt={`Screenshot ${index + 1}`}
              className="size-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-white hover:bg-white/20"
                onClick={() => setPreviewUrl(screenshot)}
              >
                <ZoomIn className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-white hover:bg-white/20"
                onClick={() => removeScreenshot(index)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        
        {screenshots.length < maxScreenshots && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25',
              'text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground'
            )}
          >
            <ImagePlus className="size-5" />
            <span className="text-[10px]">Add</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        {screenshots.length}/{maxScreenshots} screenshots
      </p>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="sr-only">Screenshot Preview</DialogTitle>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Screenshot preview"
              className="max-h-[80vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
