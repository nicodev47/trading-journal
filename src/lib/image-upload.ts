export const MAX_IMAGES_PER_TRADE = 5;
export const MAX_IMAGE_SIDE = 1600;
export const IMAGE_QUALITY = 0.8;
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

/** Resizes and compresses an image file into a JPEG data URL. */
export async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Il file non è un’immagine');
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Immagine troppo grande (massimo 15 MB)');
  }

  const image = await loadImage(file);
  const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) throw new Error('Impossibile elaborare l’immagine');

  // JPEG has no transparency: paint a dark background under transparent PNGs.
  context.fillStyle = '#0a0a0b';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
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
