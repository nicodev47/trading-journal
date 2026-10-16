export const MAX_IMAGES_PER_TRADE = 5;
/** Charts need their thin lines and small text: keep the full size up to this side. */
export const MAX_IMAGE_SIDE = 3200;
export const IMAGE_QUALITY = 0.95;
/** Images up to this size are stored exactly as they were uploaded. */
export const KEEP_ORIGINAL_BYTES = 600 * 1024;
/** Files larger than this are refused before even trying to compress them. */
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export const isDataImage = (url: string) => url.startsWith('data:image/');

/** Scales (width, height) down so the longest side is at most `maxSide`. */
export function fitWithin(width: number, height: number, maxSide = MAX_IMAGE_SIDE) {
  const longest = Math.max(width, height);

  if (longest <= maxSide || longest === 0) {
    return { width, height };
  }

  const scale = maxSide / longest;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Immagine non leggibile'));
    };
    image.src = url;
  });

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Immagine non leggibile'));
    reader.readAsDataURL(file);
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality));

/**
 * Turns an image file into a data URL without visible loss: small files are kept
 * untouched, bigger ones keep their full size (up to 3200px) and are re-encoded at
 * very high quality (WebP, or JPEG where the browser cannot write WebP).
 */
export async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Il file non è un’immagine');
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Immagine troppo grande (massimo 15 MB)');
  }

  if (file.size <= KEEP_ORIGINAL_BYTES) return readAsDataUrl(file);

  const image = await loadImage(file);
  const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) throw new Error('Impossibile elaborare l’immagine');

  // Neither WebP-as-JPEG fallback nor JPEG has transparency: paint a dark background.
  context.fillStyle = '#0a0a0b';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const webp = await canvasToBlob(canvas, 'image/webp', IMAGE_QUALITY);
  const blob =
    webp && webp.type === 'image/webp' ? webp : await canvasToBlob(canvas, 'image/jpeg', IMAGE_QUALITY);

  // Never end up bigger than the file the user gave us.
  if (!blob || blob.size >= file.size) return readAsDataUrl(file);

  return readAsDataUrl(new File([blob], 'image', { type: blob.type }));
}

/** Browsers block navigating to data: URLs, so open those through a blob URL. */
export async function openImageInNewTab(url: string) {
  if (!isDataImage(url)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  const blob = await (await fetch(url)).blob();
  const blobUrl = URL.createObjectURL(blob);

  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

/** Direct image URL for previews; TradingView snapshot links are converted. */
export function getPreviewImageUrl(url: string): string {
  if (isDataImage(url) || url.includes('s3.tradingview.com/snapshots')) return url;

  const match = url.match(/tradingview\.com\/x\/([A-Za-z0-9]+)/);

  return match ? `https://s3.tradingview.com/snapshots/t/${match[1]}.png` : url;
}
