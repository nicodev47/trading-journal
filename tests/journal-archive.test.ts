import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { createJournalArchive, readJournalArchive } from '../src/lib/journal-archive.ts';

// 1x1 transparent PNG.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const png = () => new Blob([Uint8Array.from(atob(PNG_BASE64), c => c.charCodeAt(0))], { type: 'image/png' });

const journal = {
  trades: [
    {
      id: 't1',
      screenshots: [
        { url: 'asset://abc-123', name: 'Dal PC' },
        { url: `data:image/png;base64,${PNG_BASE64}`, name: 'Vecchia' },
        { url: 'https://www.tradingview.com/x/AbCdEf/', name: 'Link' },
        { url: 'asset://manca', name: 'Persa' },
      ],
    },
  ],
};

const loadAsset = async (id: string) => (id === 'abc-123' ? { blob: png(), mimeType: 'image/png' } : null);

test('lo ZIP contiene journal.json, manifest.json e le immagini; il JSON non ha base64', async () => {
  const { blob, summary } = await createJournalArchive(JSON.stringify(journal), loadAsset);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const names = Object.keys(zip.files).sort();

  assert.deepEqual(summary, { images: 2, missing: 1 });
  assert.ok(names.includes('journal.json'));
  assert.ok(names.includes('manifest.json'));
  assert.ok(names.includes('immagini/abc-123.png'));
  assert.equal(names.filter(name => name.startsWith('immagini/img-')).length, 1);

  const json = await zip.file('journal.json')!.async('string');

  assert.ok(!json.includes('base64'));
  assert.ok(json.includes('https://www.tradingview.com/x/AbCdEf/'));
});

test('la lettura restituisce JSON e immagini, e un export va e torna senza perdite', async () => {
  const { blob } = await createJournalArchive(JSON.stringify(journal), loadAsset);
  const { json, assets } = await readJournalArchive(blob);
  const data = JSON.parse(json);

  assert.equal(assets.length, 2);
  assert.ok(assets.every(asset => asset.mimeType === 'image/png' && asset.blob.size > 0));

  for (const screenshot of data.trades[0].screenshots) {
    if (screenshot.url.startsWith('asset://') && screenshot.url !== 'asset://manca') {
      assert.ok(assets.some(asset => `asset://${asset.id}` === screenshot.url));
    }
  }
});

test('uno ZIP senza journal.json o con JSON rotto viene rifiutato', async () => {
  const empty = await new JSZip().generateAsync({ type: 'blob' });
  const broken = new JSZip();

  broken.file('journal.json', '{non json');

  await assert.rejects(readJournalArchive(empty), /journal\.json/);
  await assert.rejects(readJournalArchive(await broken.generateAsync({ type: 'blob' })), /non è valido/);
  await assert.rejects(readJournalArchive(new Blob(['non è uno zip'])), /non è leggibile/);
});

test('file fuori da immagini/ o con nomi strani vengono ignorati', async () => {
  const zip = new JSZip();

  zip.file('journal.json', '{}');
  zip.file('immagini/../fuori.png', 'x');
  zip.file('altro/a.png', 'x');
  zip.file('immagini/ok.png', Uint8Array.from(atob(PNG_BASE64), c => c.charCodeAt(0)));
  zip.file('immagini/script.exe', 'x');

  const { assets } = await readJournalArchive(await zip.generateAsync({ type: 'blob' }));

  assert.deepEqual(assets.map(asset => asset.id), ['ok']);
});
