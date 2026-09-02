import assert from 'node:assert/strict';
import test from 'node:test';
import { createZipBlob } from '../src/lib/zip-export.ts';

test('lo ZIP contiene i journal nelle tre cartelle richieste', async () => {
  const blob = createZipBlob([
    { path: 'I tuoi conti/Personale.json', content: '{"trades":[]}' },
    { path: 'Backtest/Sessione 1.json', content: '{"trades":[]}' },
    { path: 'Preview/Account 1.json', content: '{"trades":[]}' },
  ], new Date(2026, 8, 1, 12));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const archiveText = new TextDecoder().decode(bytes);

  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.ok(archiveText.includes('I tuoi conti/Personale.json'));
  assert.ok(archiveText.includes('Backtest/Sessione 1.json'));
  assert.ok(archiveText.includes('Preview/Account 1.json'));
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(bytes.length - 12, true), 3);
});
