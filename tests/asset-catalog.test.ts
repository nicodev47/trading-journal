import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_CATALOG_ASSETS, ASSET_CATALOG } from '../src/lib/asset-catalog.ts';

test('il catalogo non ha simboli duplicati e contiene NQ e MNQ', () => {
  assert.equal(new Set(ALL_CATALOG_ASSETS).size, ALL_CATALOG_ASSETS.length);
  assert.ok(ALL_CATALOG_ASSETS.includes('NQ'));
  assert.ok(ALL_CATALOG_ASSETS.includes('MNQ'));
});

test('ogni gruppo ha almeno un elemento e ogni elemento almeno un simbolo', () => {
  assert.ok(ASSET_CATALOG.every(group => group.items.length > 0));
  assert.ok(
    ASSET_CATALOG.every(group =>
      group.items.every(item => item.label && item.symbols.length > 0)
    )
  );
});

test('NQ e MNQ sono un\'unica voce NQ/MNQ che seleziona entrambi', () => {
  const futures = ASSET_CATALOG.flatMap(group => group.items);
  const nq = futures.find(item => item.label === 'NQ/MNQ');

  assert.deepEqual(nq?.symbols, ['NQ', 'MNQ']);
});

test('solo i futures hanno voci abbinate: forex, crypto e CFD sono singoli', () => {
  const singleOnly = ['Forex', 'Crypto', 'Indici (CFD)', 'Metalli e energia (CFD)'];

  ASSET_CATALOG.filter(group => singleOnly.includes(group.group)).forEach(group => {
    assert.ok(group.items.every(item => item.symbols.length === 1), group.group);
  });
});

test('toggleAssetItem aggiunge e rimuove NQ e MNQ insieme', async () => {
  const { toggleAssetItem } = await import('../src/lib/asset-catalog.ts');
  const nq = ASSET_CATALOG.flatMap(group => group.items).find(item => item.label === 'NQ/MNQ')!;

  assert.deepEqual(toggleAssetItem([], nq), ['NQ', 'MNQ']);
  assert.deepEqual(toggleAssetItem(['ES', 'NQ'], nq), ['ES', 'NQ', 'MNQ']);
  assert.deepEqual(toggleAssetItem(['ES', 'NQ', 'MNQ'], nq), ['ES']);
});
