import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectImportedChoices,
  extractImportedPreferences,
  getMissingChoices,
  planPreferencesImport,
  withImportedChoices,
} from '../src/lib/import-preferences.ts';

const file = JSON.stringify({
  trades: [
    { pair: 'ES', strategy: 'Breakout' },
    { pair: 'es', strategy: 'breakout' },
    { pair: 'NQ', strategy: 'Senza Setup' },
    { pair: 'GC', strategy: '' },
  ],
});

test('raccoglie asset e setup usati dai trade importati senza duplicati', () => {
  assert.deepEqual(collectImportedChoices(file), {
    assets: ['ES', 'NQ', 'GC'],
    setups: ['Breakout'],
  });
});

test('un file non valido non produce scelte', () => {
  assert.deepEqual(collectImportedChoices('non json'), { assets: [], setups: [] });
});

test('segnala solo ciò che manca nelle preferenze', () => {
  const missing = getMissingChoices(
    { assets: ['NQ'], setups: ['breakout'] },
    collectImportedChoices(file)
  );

  assert.deepEqual(missing, { assets: ['ES', 'GC'], setups: [] });
});

const mine = {
  onboardingCompleted: true,
  name: 'Io',
  photo: null,
  assets: ['NQ'],
  setups: ['Mio'],
  windows: [],
};
const theirs = {
  onboardingCompleted: true,
  name: 'Altro',
  photo: null,
  assets: ['ES'],
  setups: ['Breakout'],
  windows: [{ id: 'w', name: 'Apertura', start: '15:30', end: '16:10' }],
};
const withPrefs = JSON.stringify({ trades: [{ pair: 'ES', strategy: 'Breakout' }], preferences: theirs });

test('legge le preferenze incluse nel file', () => {
  assert.equal(extractImportedPreferences(withPrefs)?.name, 'Altro');
  assert.equal(extractImportedPreferences(file), null);
});

test('journal vuoto: il profilo del file viene ripristinato', () => {
  const plan = planPreferencesImport(mine, withPrefs, true);

  assert.equal(plan.restored, true);
  assert.equal(plan.patch.name, 'Altro');
  assert.deepEqual(plan.patch.windows, theirs.windows);
});

test('journal con dati: resta il tuo profilo e si aggiunge solo ciò che manca', () => {
  const plan = planPreferencesImport(mine, withPrefs, false);

  assert.equal(plan.restored, false);
  assert.equal(plan.patch.name, undefined);
  assert.deepEqual(plan.patch.assets, ['NQ', 'ES']);
  assert.deepEqual(plan.patch.setups, ['Mio', 'Breakout']);
});

test('journal vuoto ma file senza preferenze: si aggiunge soltanto ciò che manca', () => {
  const plan = planPreferencesImport(mine, file, true);

  assert.equal(plan.restored, false);
  assert.deepEqual(plan.addedAssets, ['ES', 'GC']);
});

test('la preview completa le preferenze con asset e setup usati dai trade', () => {
  const result = withImportedChoices(mine, file);

  assert.deepEqual(result.assets, ['NQ', 'ES', 'GC']);
  assert.deepEqual(result.setups, ['Mio', 'Breakout']);
  assert.equal(result.name, 'Io');
});
