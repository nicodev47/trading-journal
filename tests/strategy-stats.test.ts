import assert from 'node:assert/strict';
import test from 'node:test';
import { getStrategyRows } from '../src/lib/strategy-stats.ts';

const trade = (strategy: string, pnl: number, commission = 0) =>
  ({ id: `${strategy}${pnl}${Math.random()}`, strategy, pnl, commission }) as never;

test('raggruppa per setup e ordina per P&L', () => {
  const rows = getStrategyRows([
    trade('A', 100),
    trade('A', -40),
    trade('B', 300),
    trade('', 20),
  ]);

  assert.deepEqual(rows.map(row => row.name), ['B', 'A', 'Senza Setup']);
  assert.equal(rows[1].trades, 2);
  assert.equal(rows[1].winRate, 50);
  assert.equal(rows[1].pnl, 60);
  assert.equal(rows[1].profitFactor, 2.5);
});

test('i trade a P&L zero non contano e senza perdite il profit factor è nullo', () => {
  const rows = getStrategyRows([trade('A', 0), trade('A', 50), trade('A', 70, 10)]);

  assert.equal(rows[0].trades, 2);
  assert.equal(rows[0].profitFactor, null);
  assert.equal(rows[0].pnl, 110);
});
