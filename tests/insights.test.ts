import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInsights, type Insight } from '../src/lib/insights.ts';

let counter = 0;
const trade = (day: string, time: string, pnl: number, strategy = 'A', direction = 'long') =>
  ({
    id: `t${counter++}`,
    pair: 'NQ',
    direction,
    entryDate: `2026-06-${day}T${time}:00`,
    exitDate: `2026-06-${day}T${time}:00`,
    pnl,
    commission: 0,
    strategy,
  }) as never;

const text = (insight: Insight) =>
  insight.segments.map(segment => (typeof segment === 'string' ? segment : segment.text)).join('');

test('senza trade non ci sono frasi', () => {
  assert.deepEqual(buildInsights([], []), []);
});

test('riporta setup migliore e peggiore come semplici dati', () => {
  const insights = buildInsights(
    [trade('01', '10:00', 300, 'A'), trade('02', '10:00', -100, 'B')],
    []
  );
  const best = insights.find(insight => insight.id === 'setup-best');
  const worst = insights.find(insight => insight.id === 'setup-worst');

  assert.match(text(best!), /^Setup migliore: A \(\+300,00 USD, 1 trade, win rate 100%\)\.$/);
  assert.match(text(worst!), /^Setup peggiore: B \(-100,00 USD, 1 trade, win rate 0%\)\.$/);
});

test('nessuna frase contiene consigli o toni colloquiali', () => {
  const trades = [
    ...Array.from({ length: 6 }, (_, index) =>
      trade(String(index + 1).padStart(2, '0'), '10:00', -50, 'Debole')
    ),
    trade('10', '10:00', 400, 'Forte'),
  ];
  const all = buildInsights(trades, [])
    .map(text)
    .join(' ')
    .toLowerCase();

  ['prova a', 'valuta di', 'potresti', 'cavallo di battaglia', 'fai più fatica', 'consigli'].forEach(word =>
    assert.ok(!all.includes(word), word)
  );
});

test('i trade senza orario (00:00) non compaiono nelle finestre', () => {
  const insights = buildInsights(
    [trade('01', '00:00', -900), trade('02', '10:00', 100)],
    [{ id: 'w', name: 'Mattina', start: '09:00', end: '12:00' }]
  );

  assert.ok(insights.every(insight => insight.id !== 'window-outside'));
});

test('con soli profitti riporta che non ci sono perdite', () => {
  const average = buildInsights([trade('01', '10:00', 100), trade('02', '10:00', 200)], []).find(
    insight => insight.id === 'average'
  );

  assert.match(text(average!), /Nessuna perdita registrata/);
});
