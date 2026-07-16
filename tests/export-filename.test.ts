import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getGuidedExportBaseName,
  normalizeExportFileName,
} from '../src/lib/export-filename.ts';

const exportDate = new Date(2026, 6, 15, 12, 0, 0);

test('il wizard suggerisce i nomi previsti per ogni tipo di export', () => {
  assert.equal(
    getGuidedExportBaseName('personal', exportDate),
    'eclipsejournal-personale-2026-07-15'
  );
  assert.equal(
    getGuidedExportBaseName('backtest', exportDate),
    'eclipsejournal-backtest-2026-07-15'
  );
  assert.equal(
    getGuidedExportBaseName('student', exportDate),
    'eclipsejournal-preview-2026-07-15'
  );
  assert.equal(
    getGuidedExportBaseName('full-backup', exportDate),
    'eclipsejournal-backup-completo-2026-07-15'
  );
});

test('la normalizzazione evita estensioni JSON duplicate', () => {
  assert.equal(
    normalizeExportFileName('report.json.json', 'fallback'),
    'report.json'
  );
});

test('la normalizzazione ripulisce spazi e caratteri non validi', () => {
  assert.equal(
    normalizeExportFileName('  Report: Luglio / 2026?.json  ', 'fallback'),
    'report-luglio-2026.json'
  );
});

test('un nome vuoto ripristina il suggerimento', () => {
  assert.equal(
    normalizeExportFileName('   ', 'eclipsejournal-personale-2026-07-15'),
    'eclipsejournal-personale-2026-07-15.json'
  );
});
