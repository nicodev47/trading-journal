import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { ASSET_CATALOG } from '../src/lib/asset-catalog.ts';
import { getAssetLogos } from '../src/lib/asset-logos.ts';

test('ogni asset del catalogo ha un logo e il file esiste', () => {
  ASSET_CATALOG.flatMap(group => group.items.flatMap(item => item.symbols)).forEach(symbol => {
    const logos = getAssetLogos(symbol);

    assert.ok(logos.length > 0, `manca il logo di ${symbol}`);
    logos.forEach(name => assert.ok(existsSync(`public/asset-logos/${name}.svg`), `${symbol}: ${name}.svg`));
  });
});

test('NQ usa il logo del Nasdaq 100 e le coppie forex due bandiere', () => {
  assert.deepEqual(getAssetLogos('NQ'), ['nasdaq-100']);
  assert.deepEqual(getAssetLogos('EURUSD'), ['country-eu', 'country-us']);
  assert.deepEqual(getAssetLogos('GBPJPY'), ['country-gb', 'country-jp']);
  assert.deepEqual(getAssetLogos('SCONOSCIUTO'), []);
});
