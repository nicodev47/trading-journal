import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { assetIdOf, isAssetUrl } from '@/lib/journal-archive';
import { getStoredImage } from '@/lib/image-store';

interface JournalImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Address shown by the browser (links and embedded images). */
  src: string;
  /** Original attachment url: when it is asset://…, the image is read from the local store. */
  url: string;
}

/** An <img> that also understands images uploaded from the computer (asset://). */
export function JournalImage({ src, url, ...props }: JournalImageProps) {
  const [localSrc, setLocalSrc] = useState<string | null>(null);

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

  const shown = isAssetUrl(url) ? localSrc : src;

  // eslint-disable-next-line jsx-a11y/alt-text
  return shown ? <img src={shown} {...props} /> : null;
}
