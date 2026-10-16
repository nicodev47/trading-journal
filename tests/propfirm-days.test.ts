import assert from 'node:assert/strict';
import test from 'node:test';
import { getAccountDays, tradesToDays } from '../src/lib/propfirm/days.ts';
import type { PropAccount } from '../src/lib/propfirm/types.ts';

const trade = (date: string, pnl: number, commission = 0) =>
  ({ id: `${date}${pnl}`, exitDate: `${date}T10:00:00`, entryDate: `${date}T10:00:00`, pnl, commission }) as never;

test('raggruppa i trade per giorno e ignora quelli prima della data di inizio', () => {
  const days = tradesToDays(
    [trade('2026-06-02', 100), trade('2026-06-02', -30, 2), trade('2026-06-01', 999), trade('2026-06-03', 0)],
    '2026-06-02'
  );

  assert.deepEqual(days, [{ date: '2026-06-02', pnl: 68 }]);
});

test('un conto collegato legge i trade del suo journal', () => {
  const account = {
    size: 50000,
    startDate: '2026-06-01',
    source: { kind: 'journal', journalId: 'personal' },
    balanceUpdates: [],
  } as unknown as PropAccount;
  const days = getAccountDays(account, id => (id === 'personal' ? [trade('2026-06-01', 50)] : []));

  assert.deepEqual(days, [{ date: '2026-06-01', pnl: 50 }]);
});

test('un conto manuale usa i saldi aggiornati', () => {
  const account = {
    size: 50000,
    startDate: '2026-06-01',
    source: { kind: 'manual' },
    balanceUpdates: [
      { date: '2026-05-30', balance: 49000 },
      { date: '2026-06-02', balance: 50400 },
      { date: '2026-06-03', balance: 50100 },
    ],
  } as unknown as PropAccount;

  assert.deepEqual(getAccountDays(account, () => []), [
    { date: '2026-06-02', pnl: 50400 - 50000 },
    { date: '2026-06-03', pnl: -300 },
  ]);
});

test('un trade assegnato a una prop conta solo per quella', async () => {
  const { getAccountDays } = await import('../src/lib/propfirm/days.ts');
  const trade = (id: string, ids?: string[]) =>
    ({ id, pnl: 100, commission: 0, exitDate: '2026-06-02T10:00:00', entryDate: '2026-06-02T10:00:00', propAccountIds: ids }) as never;
  const trades = [trade('a', ['x']), trade('b', ['y']), trade('c')];
  const account = (id: string) =>
    ({ id, source: { kind: 'journal', journalId: 'personal' }, startDate: '2026-01-01', size: 50000, balanceUpdates: [] }) as never;

  assert.equal(getAccountDays(account('x'), () => trades)[0].pnl, 200);
  assert.equal(getAccountDays(account('y'), () => trades)[0].pnl, 200);
  assert.equal(getAccountDays(account('z'), () => trades)[0].pnl, 100);
});
