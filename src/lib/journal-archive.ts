import JSZip from 'jszip';

/** Images uploaded from the computer are kept in the browser and referenced as asset://<id>. */
export const ASSET_PREFIX = 'asset://';

const FORMAT = 'eclipse-journal-archive';
const VERSION = 1;
const JOURNAL_FILE = 'journal.json';
const MANIFEST_FILE = 'manifest.json';
const IMAGES_DIR = 'immagini/';

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/heic': 'heic',
  'image/heif': 'heif',
};
const MIME_TYPES: Record<string, string> = {
  ...Object.fromEntries(Object.entries(EXTENSIONS).map(([mime, ext]) => [ext, mime])),
  jpeg: 'image/jpeg',
  tif: 'image/tiff',
};
const SAFE_ID = /^[\w-]{1,100}$/;

export interface ArchiveAsset {
  id: string;
  blob: Blob;
  mimeType: string;
}

export interface ArchiveSummary {
  images: number;
  /** asset:// references whose image was not found in this browser. */
  missing: number;
}

export type AssetLoader = (id: string) => Promise<{ blob: Blob; mimeType: string } | null>;

export const isAssetUrl = (url: string) => url.startsWith(ASSET_PREFIX) && url.length > ASSET_PREFIX.length;
export const assetIdOf = (url: string) => url.slice(ASSET_PREFIX.length);

const sha256Hex = async (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

async function decodeDataImage(url: string): Promise<{ blob: Blob; mimeType: string } | null> {
  const match = url.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);

  if (!match || !EXTENSIONS[match[1]]) return null;

  try {
    const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0));

    return { blob: new Blob([bytes], { type: match[1] }), mimeType: match[1] };
  } catch {
    return null;
  }
}

/**
 * Builds the ZIP of a journal export: journal.json (same data as the plain JSON export, with every
 * image replaced by an asset:// reference), manifest.json and the images in the immagini/ folder.
 * Images embedded as data: URLs are moved into files too, so the JSON stays small.
 */
export async function createJournalArchive(
  json: string,
  loadAsset: AssetLoader,
  now = new Date()
): Promise<{ blob: Blob; summary: ArchiveSummary }> {
  const files = new Map<string, ArchiveAsset>();
  let missing = 0;
  const converted = new Map<string, string>();

  const convert = async (value: unknown): Promise<unknown> => {
    if (typeof value === 'string') {
      if (value.startsWith('data:image/')) {
        const cached = converted.get(value);

        if (cached) return cached;

        const decoded = await decodeDataImage(value);

        if (!decoded) return value;

        const id = `img-${(await sha256Hex(await decoded.blob.arrayBuffer())).slice(0, 24)}`;

        files.set(id, { id, ...decoded });
        converted.set(value, `${ASSET_PREFIX}${id}`);

        return `${ASSET_PREFIX}${id}`;
      }

      if (isAssetUrl(value)) {
        const id = assetIdOf(value);

        if (files.has(id)) return value;

        const asset = SAFE_ID.test(id) ? await loadAsset(id) : null;

        if (asset && EXTENSIONS[asset.mimeType]) {
          files.set(id, { id, ...asset });
        } else {
          missing += 1;
        }
      }

      return value;
    }

    if (Array.isArray(value)) {
      const items: unknown[] = [];

      for (const item of value) items.push(await convert(item));

      return items;
    }

    if (value && typeof value === 'object') {
      const entries: [string, unknown][] = [];

      for (const [key, item] of Object.entries(value)) entries.push([key, await convert(item)]);

      return Object.fromEntries(entries);
    }

    return value;
  };

  const data = await convert(JSON.parse(json));
  const zip = new JSZip();
  const images = Array.from(files.values());

  zip.file(JOURNAL_FILE, JSON.stringify(data, null, 2));
  zip.file(
    MANIFEST_FILE,
    JSON.stringify(
      {
        format: FORMAT,
        version: VERSION,
        createdAt: now.toISOString(),
        images: images.map(image => ({
          id: image.id,
          file: `${IMAGES_DIR}${image.id}.${EXTENSIONS[image.mimeType]}`,
          mimeType: image.mimeType,
          size: image.blob.size,
        })),
      },
      null,
      2
    )
  );

  for (const image of images) {
    zip.file(`${IMAGES_DIR}${image.id}.${EXTENSIONS[image.mimeType]}`, await image.blob.arrayBuffer(), {
      // Images are already compressed.
      compression: 'STORE',
    });
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

  return { blob, summary: { images: images.length, missing } };
}

export class InvalidArchiveError extends Error {}

/** Reads a journal ZIP: the journal JSON as text plus its images, ready to be stored locally. */
export async function readJournalArchive(file: Blob): Promise<{ json: string; assets: ArchiveAsset[] }> {
  let zip: JSZip;

  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new InvalidArchiveError('Il file ZIP non è leggibile.');
  }

  const entries = Object.values(zip.files).filter(entry => !entry.dir);

  const journalEntry = zip.file(JOURNAL_FILE);

  if (!journalEntry) throw new InvalidArchiveError('Nello ZIP manca il file journal.json.');

  const json = await journalEntry.async('string');

  try {
    JSON.parse(json);
  } catch {
    throw new InvalidArchiveError('Il file journal.json non è valido.');
  }

  const assets: ArchiveAsset[] = [];

  for (const entry of entries) {
    // Only files directly inside immagini/ with a plain name are read; anything else is ignored.
    const match = entry.name.match(/^immagini\/([\w-]{1,100})\.(\w{2,5})$/);
    const mimeType = match ? MIME_TYPES[match[2].toLowerCase()] : undefined;

    if (!match || !mimeType) continue;

    const bytes = await entry.async('arraybuffer');

    assets.push({ id: match[1], blob: new Blob([bytes], { type: mimeType }), mimeType });
  }

  return { json, assets };
}
