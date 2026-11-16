import { useEffect, useMemo, useState, type ImgHTMLAttributes } from 'react';
import { assetIdOf, isAssetUrl } from '@/lib/journal-archive';
import { getStoredImage } from '@/lib/image-store';
import { getDriveFileId } from '@/lib/image-upload';

/** Remote images (TradingView…) sometimes fail once and load fine a moment later. */
const RETRY_DELAYS_MS = [600, 1500];

interface Attempt {
  src: string;
  /** Wait before trying this address. */
  delay: number;
}

/**
 * Addresses to try, in order: the preview itself, a couple of retries, then (for Google Drive files)
 * the other public image addresses Drive offers, since each one works for different files.
 */
function buildAttempts(src: string, url: string): Attempt[] {
  const withRetry = (retry: number) => `${src}${src.includes('?') ? '&' : '?'}retry=${retry}`;
  const attempts: Attempt[] = [
    { src, delay: 0 },
    ...RETRY_DELAYS_MS.map((delay, index) => ({ src: withRetry(index + 1), delay })),
  ];
  const driveId = getDriveFileId(url);

  if (driveId) {
    attempts.push(
      { src: `https://lh3.googleusercontent.com/d/${driveId}=w2000`, delay: 0 },
      { src: `https://drive.google.com/uc?export=view&id=${driveId}`, delay: 0 }
    );
  }

  return attempts;
}

interface JournalImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Address shown by the browser (links and embedded images). */
  src: string;
  /** Original attachment url: when it is asset://…, the image is read from the local store. */
  url: string;
}

/** An <img> that also understands images uploaded from the computer (asset://). */
export function JournalImage({ src, url, onError, ...props }: JournalImageProps) {
  const [localSrc, setLocalSrc] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setAttempt(0), [src, url]);

  useEffect(() => {
    if (!isAssetUrl(url)) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    void getStoredImage(assetIdOf(url)).then(stored => {
      if (cancelled || !stored) return;

      objectUrl = URL.createObjectURL(stored.blob);
      setLocalSrc(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setLocalSrc(null);
    };
  }, [url]);

  const attempts = useMemo(() => buildAttempts(src, url), [src, url]);
  const shown = isAssetUrl(url) ? localSrc : attempts[Math.min(attempt, attempts.length - 1)].src;

  return shown ? (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      src={shown}
      referrerPolicy="no-referrer"
      {...props}
      onError={event => {
        // Embedded and local images never need another try.
        if (isAssetUrl(url) || src.startsWith('data:') || attempt >= attempts.length - 1) {
          onError?.(event);
          return;
        }

        window.setTimeout(() => setAttempt(current => current + 1), attempts[attempt + 1].delay);
      }}
    />
  ) : null;
}
