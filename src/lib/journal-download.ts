import { createJournalArchive, type ArchiveSummary } from './journal-archive.ts';
import { getStoredImage } from './image-store.ts';

/** Saves a Blob through the browser's download. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** Packs an export JSON and its images into a ZIP and downloads it. */
export async function downloadJournalArchive(json: string, fileName: string): Promise<ArchiveSummary> {
  const { blob, summary } = await createJournalArchive(json, getStoredImage);

  downloadBlob(blob, fileName);

  return summary;
}
