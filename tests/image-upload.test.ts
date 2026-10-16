import assert from 'node:assert/strict';
import test from 'node:test';
import { fitWithin, isDataImage } from '../src/lib/image-upload.ts';

test('un’immagine piccola non viene ridimensionata', () => {
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
});

test('il lato più lungo viene portato al massimo mantenendo le proporzioni', () => {
  assert.deepEqual(fitWithin(6400, 3200), { width: 3200, height: 1600 });
  assert.deepEqual(fitWithin(3200, 1600, 1600), { width: 1600, height: 800 });
  assert.deepEqual(fitWithin(1000, 4000, 1600), { width: 400, height: 1600 });
});

test('dimensioni nulle non producono NaN', () => {
  assert.deepEqual(fitWithin(0, 0), { width: 0, height: 0 });
});

test('riconosce le immagini incorporate', () => {
  assert.equal(isDataImage('data:image/jpeg;base64,AAAA'), true);
  assert.equal(isDataImage('https://example.com/a.png'), false);
});
