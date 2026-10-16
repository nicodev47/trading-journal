import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDayRows, getTradeAccounts, groupByTrade } from '../src/lib/day-accounts.ts';
import type { Trade } from '../src/lib/types/trade.ts';

const trade = (id: string, extra: Partial<Trade> = {}) => ({ id, pnl: 100, ...extra }) as Trade;

test('lo stesso trade su più account è una riga sola con tutti gli account', () => {
  const rows = groupByTrade([
    { workspaceId: 'personal', trade: trade('a') },
    { workspaceId: 'secondary', trade: trade('a') },
    { workspaceId: 'secondary', trade: trade('b') },
  ]);

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].accounts, ['personal', 'secondary']);
  assert.deepEqual(rows[1].accounts, ['secondary']);
});

test('un trade senza account vale per il journal in cui sta', () => {
  assert.deepEqual(getTradeAccounts(trade('a'), 'personal'), ['personal']);
  assert.deepEqual(getTradeAccounts(trade('a', { accounts: ['x', 'y'] }), 'personal'), ['x', 'y']);
});

test('salvare il giorno scrive il trade negli account scelti e lo toglie dagli altri', () => {
  const rows = [trade('a', { accounts: ['secondary'] })];

  assert.deepEqual(applyDayRows([trade('a')], ['a'], rows, 'personal').map(t => t.id), []);
  assert.deepEqual(applyDayRows([], ['a'], rows, 'secondary').map(t => t.id), ['a']);
});

test('i trade non caricati nell’editor non vengono toccati', () => {
  const result = applyDayRows([trade('keep'), trade('a')], ['a'], [trade('a', { accounts: ['x'] })], 'x');

  assert.deepEqual(result.map(t => t.id).sort(), ['a', 'keep']);
});

test('modificare un trade aggiorna tutte le sue copie', () => {
  const rows = [trade('a', { pnl: 250, accounts: ['p', 's'] })];

  assert.equal(applyDayRows([trade('a')], ['a'], rows, 'p')[0].pnl, 250);
  assert.equal(applyDayRows([trade('a')], ['a'], rows, 's')[0].pnl, 250);
});
