import assert from 'node:assert/strict';
import test from 'node:test';
import { copyIdFor, getCopiedTo, syncCopies } from '../src/lib/copy-trading.ts';
import type { Trade } from '../src/lib/types/trade.ts';

const trade = (id: string, extra: Partial<Trade> = {}) => ({ id, pnl: 100, ...extra }) as Trade;

test('copia i trade in un account selezionato', () => {
  const result = syncCopies([trade('own')], ['a'], [trade('a')], 'custom-1', true);

  assert.deepEqual(result.map(item => item.id), ['own', copyIdFor('a', 'custom-1')]);
  assert.equal(result[1].copySourceId, 'a');
});

test('risincronizzare non duplica le copie', () => {
  const once = syncCopies([], ['a'], [trade('a')], 'x', true);
  const twice = syncCopies(once, ['a'], [trade('a', { pnl: 250 })], 'x', true);

  assert.equal(twice.length, 1);
  assert.equal(twice[0].pnl, 250);
});

test('deselezionare l’account toglie le copie ma non i trade suoi', () => {
  const state = [trade('own'), ...syncCopies([], ['a'], [trade('a')], 'x', true)];
  const result = syncCopies(state, ['a'], [trade('a')], 'x', false);

  assert.deepEqual(result.map(item => item.id), ['own']);
});

test('un trade cancellato alla sorgente sparisce anche dalla copia', () => {
  const state = syncCopies([], ['a', 'b'], [trade('a'), trade('b')], 'x', true);
  const result = syncCopies(state, ['a', 'b'], [trade('a')], 'x', true);

  assert.deepEqual(result.map(item => item.copySourceId), ['a']);
});

test('getCopiedTo unisce gli account dei trade del giorno', () => {
  assert.deepEqual(getCopiedTo([trade('a', { copiedTo: ['x'] }), trade('b', { copiedTo: ['x', 'y'] })]).sort(), ['x', 'y']);
});
