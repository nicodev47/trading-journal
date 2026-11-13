import { ASSET_PREFIX, isAssetUrl, assetIdOf, type ArchiveAsset } from './journal-archive.ts';
import { fileToCompressedDataUrl, isDataImage, openImageInNewTab } from './image-upload.ts';
import type { ScreenshotData } from './types/trade.ts';

const DATABASE_NAME = 'eclipse-journal-images';
const STORE_NAME = 'images';

interface StoredImage {
  id: string;
  blob: Blob;
  mimeType: string;
  name: string;
  createdAt: string;
}

let databasePromise: Promise<IDBDatabase> | null = null;

const openDatabase = () => {
  databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error('Archivio immagini non disponibile'));
    };
  });

  return databasePromise;
};

const run = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) => {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const request = action(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/** Images stay in the browser (not in localStorage, which is too small for them). */
export const isLocalImage = (url: string) => isDataImage(url) || isAssetUrl(url);

export async function getStoredImage(id: string): Promise<{ blob: Blob; mimeType: string } | null> {
  try {
    const record = await run<StoredImage | undefined>('readonly', store => store.get(id));

    return record ? { blob: record.blob, mimeType: record.mimeType } : null;
  } catch {
    return null;
  }
}

export const putStoredImage = (id: string, blob: Blob, mimeType: string, name = 'Immagine') =>
  run('readwrite', store =>
    store.put({ id, blob, mimeType, name, createdAt: new Date().toISOString() } satisfies StoredImage)
  );

const OPTIMIZABLE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * The picture keeps its full size. Small files are stored untouched; bigger PNG/JPEG/WebP files are
 * only re-encoded (high quality WebP, same pixels) when that makes them smaller, otherwise the
 * original file is kept. Anything the browser cannot re-encode is stored as it is.
 */
async function optimizeKeepingSize(file: File): Promise<Blob> {
  if (!OPTIMIZABLE_TYPES.includes(file.type)) return file;

  try {
    return await (await fetch(await fileToCompressedDataUrl(file, Number.POSITIVE_INFINITY))).blob();
  } catch {
    return file;
  }
}

/** Stores a file picked from the computer at its original size and returns its attachment. */
export async function saveUploadedImage(file: File, name: string): Promise<ScreenshotData> {
  if (!file.type.startsWith('image/')) throw new Error('Il file non è un’immagine');

  const id = crypto.randomUUID();
  const blob = await optimizeKeepingSize(file);

  await putStoredImage(id, blob, blob.type || file.type, name);

  return { url: `${ASSET_PREFIX}${id}`, name };
}

export async function storeArchiveAssets(assets: ArchiveAsset[]) {
  for (const asset of assets) await putStoredImage(asset.id, asset.blob, asset.mimeType);
}

/** Opens any attachment in a new tab, whether it is a link, an embedded image or a local file. */
export async function openJournalImage(url: string) {
  if (!isAssetUrl(url)) return openImageInNewTab(url);

  const stored = await getStoredImage(assetIdOf(url));

  if (!stored) return;

  const blobUrl = URL.createObjectURL(stored.blob);

  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
