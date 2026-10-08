import assert from 'node:assert/strict';
import test from 'node:test';
import { collectImportedChoices, getMissingChoices } from '../src/lib/import-preferences.ts';

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
