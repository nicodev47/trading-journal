import assert from 'node:assert/strict';
import test from 'node:test';
import { personalizeDemoTrades } from '../src/components/trading-journal/tutorial/tutorial-constants.ts';

const demo = [
  { time: '15:35', pair: 'NQ', strategy: 'A' },
  { time: '10:20', pair: 'MNQ', strategy: 'B' },
  { time: '16:05', pair: 'NQ', strategy: 'C' },
];

test('senza preferenze i trade demo restano invariati', () => {
  assert.deepEqual(personalizeDemoTrades(demo), demo);
});

test('asset e setup dell’utente vengono ciclati sui trade demo', () => {
  const result = personalizeDemoTrades(demo, {
    assets: ['ES'],
    setups: ['Breakout', 'Pullback'],
    windows: [],
  });

  assert.deepEqual(result.map(trade => trade.pair), ['ES', 'ES', 'ES']);
  assert.deepEqual(result.map(trade => trade.strategy), ['Breakout', 'Pullback', 'Breakout']);
  assert.deepEqual(result.map(trade => trade.time), ['15:35', '10:20', '16:05']);
});

test('gli orari demo cadono nella prima finestra operativa', () => {
  const result = personalizeDemoTrades(demo, {
    assets: [],
    setups: [],
    windows: [{ id: 'w', name: 'Apertura NY', start: '15:30', end: '16:10' }],
  });

  assert.deepEqual(result.map(trade => trade.time), ['15:35', '15:45', '15:55']);
  assert.deepEqual(result.map(trade => trade.pair), ['NQ', 'MNQ', 'NQ']);
});

test('finestre incomplete non alterano gli orari demo', () => {
  const result = personalizeDemoTrades(demo, {
    assets: [],
    setups: [],
    windows: [{ id: 'w', name: '', start: '', end: '' }],
  });

  assert.deepEqual(result.map(trade => trade.time), ['15:35', '10:20', '16:05']);
});

test('nella settimana di un bank holiday i trade demo sono meno e mai nel bank holiday', async () => {
  const { getTutorialDemoDays, createSimpleTutorialTrades, isValidTutorialTradeSet } = await import(
    '../src/components/trading-journal/tutorial/tutorial-constants.ts'
  );
  const { isUsBankHoliday } = await import('../src/lib/bank-holidays.ts');

  // Week of 9-13 Nov 2026 has Veterans Day on Wednesday 11.
  const days = getTutorialDemoDays(new Date(2026, 10, 12, 12, 0, 0));

  assert.deepEqual(days, ['2026-11-09', '2026-11-10', '2026-11-12', '2026-11-13']);
  assert.ok(days.every(day => !isUsBankHoliday(day)));

  const trades = createSimpleTutorialTrades('2026-11-12');

  assert.equal(trades.length, 4);
  assert.deepEqual(trades.map(trade => trade.entryDate.slice(0, 10)), days);
  assert.ok(isValidTutorialTradeSet(trades));

  // A normal week keeps Monday to Friday and five trades.
  assert.deepEqual(getTutorialDemoDays(new Date(2026, 10, 18, 12, 0, 0)), [
    '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20',
  ]);
  assert.equal(createSimpleTutorialTrades('2026-11-18').length, 5);
});
