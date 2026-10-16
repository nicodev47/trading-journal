import assert from 'node:assert/strict';
import test from 'node:test';
import {
  balanceUpdatesToDays,
  floorFor,
  getRequiredProfit,
  previewNextDay,
  simulateAccount,
} from '../src/lib/propfirm/engine.ts';
import type { PropRules } from '../src/lib/propfirm/types.ts';

const rules = (overrides: Partial<PropRules> = {}): PropRules => ({
  profitTarget: 3000,
  drawdown: { amount: 2000, type: 'eod-trailing', locksAtStart: true },
  dailyLossLimit: null,
  consistency: { maxDayShare: 0.5, appliesTo: 'evaluation' },
  minTradingDays: 0,
  payout: {
    split: 0.9,
    minRequest: 125,
    minWinningDays: 5,
    winningDayMin: 150,
    buffer: 0,
    capPerPayout: null,
  },
  maxContracts: null,
  ...overrides,
});

const days = (values: number[]) =>
  values.map((pnl, index) => ({ date: `2026-06-${String(index + 1).padStart(2, '0')}`, pnl }));

test('il floor trailing sale col picco e si blocca al saldo iniziale', () => {
  const r = rules();

  assert.equal(floorFor(r, 50000, 50000), 48000);
  assert.equal(floorFor(r, 50000, 51000), 49000);
  assert.equal(floorFor(r, 50000, 53000), 50000);
  assert.equal(floorFor(r, 50000, 60000), 50000);
  assert.equal(floorFor(rules({ drawdown: { amount: 2000, type: 'eod-trailing', locksAtStart: false } }), 50000, 53000), 51000);
});

test('drawdown statico: il floor non si muove', () => {
  const r = rules({ drawdown: { amount: 2000, type: 'static', locksAtStart: false } });

  assert.equal(floorFor(r, 50000, 56000), 48000);
});

test('violazione del drawdown trailing', () => {
  // sale a 51.500 (floor 49.500) poi scende a 49.400 -> fallito
  const sim = simulateAccount({
    kind: 'evaluation',
    size: 50000,
    rules: rules(),
    days: days([1500, -2100]),
    payouts: [],
  });

  assert.equal(sim.status, 'failed');
  assert.equal(sim.failReason, 'drawdown');
  assert.equal(sim.endedOn, '2026-06-02');
});

test('valutazione superata raggiungendo l’obiettivo', () => {
  const sim = simulateAccount({
    kind: 'evaluation',
    size: 50000,
    rules: rules(),
    days: days([1000, 1000, 1100]),
    payouts: [],
  });

  assert.equal(sim.status, 'passed');
  assert.equal(sim.endedOn, '2026-06-03');
  assert.equal(sim.profit, 3100);
});

test('la consistenza alza l’obiettivo invece di far fallire', () => {
  // miglior giorno 2.500: serve profitto >= 5.000
  assert.equal(getRequiredProfit(rules(), 2500), 5000);

  const sim = simulateAccount({
    kind: 'evaluation',
    size: 50000,
    rules: rules(),
    days: days([2500, 800]),
    payouts: [],
  });

  assert.equal(sim.status, 'active');
  assert.equal(sim.requiredProfit, 5000);
  assert.equal(sim.profitToGo, 1700);
  assert.equal(sim.consistency?.ok, false);
  assert.equal(sim.consistency?.profitToFix, 1700);
});

test('giorni minimi: non si supera prima', () => {
  const sim = simulateAccount({
    kind: 'evaluation',
    size: 50000,
    rules: rules({ minTradingDays: 3, consistency: null }),
    days: days([3200]),
    payouts: [],
  });

  assert.equal(sim.status, 'active');
});

test('limite giornaliero: violazione o solo blocco del giorno', () => {
  const breach = simulateAccount({
    kind: 'evaluation',
    size: 50000,
    rules: rules({ dailyLossLimit: { amount: 1000, effect: 'breach' } }),
    days: days([-1000]),
    payouts: [],
  });
  const lock = simulateAccount({
    kind: 'evaluation',
    size: 50000,
    rules: rules({ dailyLossLimit: { amount: 1000, effect: 'lock-day' } }),
    days: days([-1000]),
    payouts: [],
  });

  assert.equal(breach.failReason, 'daily-loss');
  assert.equal(lock.status, 'active');
  assert.equal(lock.days[0].dayLocked, true);
});

test('statistiche di consistenza: massimo guadagno di domani', () => {
  const sim = simulateAccount({
    kind: 'evaluation',
    size: 50000,
    rules: rules({ profitTarget: 99999 }),
    days: days([1000, 500, 500]),
    payouts: [],
  });

  // profitto 2.000, limite 50%: domani al massimo 0,5*2000/0,5 = 2.000
  assert.equal(sim.consistency?.biggestNextDay, 2000);
  assert.equal(sim.consistency?.share, 0.5);
  assert.equal(sim.consistency?.ok, true);
});

test('anteprima di un giorno in più', () => {
  const input = {
    kind: 'evaluation' as const,
    size: 50000,
    rules: rules({ profitTarget: 99999 }),
    days: days([1000, 500]),
    payouts: [],
  };

  assert.equal(previewNextDay(input, 2000).consistency?.ok, false);
  assert.equal(previewNextDay(input, 500).consistency?.ok, true);
});

test('funded: payout disponibile, giorni vincenti e split', () => {
  const sim = simulateAccount({
    kind: 'funded',
    size: 50000,
    rules: rules({ profitTarget: null, consistency: null }),
    days: days([200, 300, 250, 400, 160]),
    payouts: [],
  });

  assert.equal(sim.payout?.winningDays, 5);
  assert.equal(sim.payout?.available, 1310);
  assert.equal(sim.payout?.eligible, true);
});

test('funded: mancano giorni vincenti', () => {
  const sim = simulateAccount({
    kind: 'funded',
    size: 50000,
    rules: rules({ profitTarget: null, consistency: null }),
    days: days([900, 100]),
    payouts: [],
  });

  assert.equal(sim.payout?.eligible, false);
  assert.ok(sim.payout?.missing.some(text => text.includes('giorni vincenti')));
});

test('un payout riduce saldo e margine ma non il picco, e azzera i giorni vincenti', () => {
  const base = {
    kind: 'funded' as const,
    size: 50000,
    rules: rules({ profitTarget: null, consistency: null }),
    days: days([500, 500, 500, 500, 500]),
  };
  const before = simulateAccount({ ...base, payouts: [] });
  const after = simulateAccount({
    ...base,
    payouts: [{ id: 'p', date: '2026-06-06', gross: 1000 }],
  });

  assert.equal(after.room, before.room - 1000);
  assert.equal(after.floor, before.floor);
  assert.equal(after.balance, before.balance - 1000);
  assert.equal(after.payout?.winningDays, 0);
  assert.equal(after.payout?.paidGross, 1000);
  assert.equal(after.payout?.paidNet, 900);
});

test('tetto per payout', () => {
  const sim = simulateAccount({
    kind: 'funded',
    size: 50000,
    rules: rules({
      profitTarget: null,
      consistency: null,
      payout: { split: 0.9, minRequest: 125, minWinningDays: 0, winningDayMin: 0, buffer: 0, capPerPayout: 2000 },
    }),
    days: days([4000]),
    payouts: [],
  });

  assert.equal(sim.payout?.available, 2000);
});

test('conto manuale: i saldi diventano risultati giornalieri', () => {
  assert.deepEqual(
    balanceUpdatesToDays(50000, [
      { date: '2026-06-02', balance: 50900 },
      { date: '2026-06-01', balance: 50500 },
    ]),
    [
      { date: '2026-06-01', pnl: 500 },
      { date: '2026-06-02', pnl: 400 },
    ]
  );
});

test('il tetto del payout segue il numero del payout', () => {
  const r = rules({
    payout: { split: 0.9, minRequest: 0, minWinningDays: 0, winningDayMin: 0, buffer: 0, capPerPayout: null, capSchedule: [1000, 2000] },
  });
  const first = simulateAccount({ kind: 'funded', size: 50000, rules: r, days: days([5000]), payouts: [] });
  const second = simulateAccount({
    kind: 'funded',
    size: 50000,
    rules: r,
    days: days([5000]),
    payouts: [{ id: 'p', date: '2026-05-01', gross: 1000 }],
  });

  assert.equal(first.payout?.available, 1000);
  assert.equal(second.payout?.available, 2000);
});
