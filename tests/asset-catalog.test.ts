import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_CATALOG_ASSETS, ASSET_CATALOG } from '../src/lib/asset-catalog.ts';

test('il catalogo non ha duplicati e contiene NQ e MNQ', () => {
  assert.equal(new Set(ALL_CATALOG_ASSETS).size, ALL_CATALOG_ASSETS.length);
  assert.ok(ALL_CATALOG_ASSETS.includes('NQ'));
  assert.ok(ALL_CATALOG_ASSETS.includes('MNQ'));
});

test('ogni gruppo ha almeno un asset', () => {
  assert.ok(ASSET_CATALOG.every(group => group.items.length > 0));
});
