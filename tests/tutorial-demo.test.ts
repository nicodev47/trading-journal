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
