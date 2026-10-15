import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInsights, MIN_TRADES_FOR_TIPS, type Insight } from '../src/lib/insights.ts';

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

test('indica il setup migliore e quello più debole', () => {
  const insights = buildInsights(
    [trade('01', '10:00', 300, 'A'), trade('02', '10:00', -100, 'B')],
    []
  );
  const best = insights.find(insight => insight.id === 'setup-best');
  const worst = insights.find(insight => insight.id === 'setup-worst');

  assert.match(text(best!), /Il setup più redditizio è A/);
  assert.match(text(worst!), /Il più debole è B/);
});

test('con pochi trade non propone consigli sul setup', () => {
  const insights = buildInsights(
    [trade('01', '10:00', 300, 'A'), trade('02', '10:00', -100, 'B')],
    []
  );

  assert.ok(insights.every(insight => insight.id !== 'setup-worst' || !insight.tip));
});

test('con abbastanza trade in perdita suggerisce di rivedere il setup', () => {
  const trades = [
    ...Array.from({ length: MIN_TRADES_FOR_TIPS }, (_, index) =>
      trade(String(index + 1).padStart(2, '0'), '10:00', -50, 'Debole')
    ),
    trade('10', '10:00', 400, 'Forte'),
  ];
  const worst = buildInsights(trades, []).find(insight => insight.id === 'setup-worst');

  assert.ok(worst?.tip);
});

test('i trade senza orario (00:00) non compaiono nelle finestre', () => {
  const insights = buildInsights(
    [trade('01', '00:00', -900), trade('02', '10:00', 100)],
    [{ id: 'w', name: 'Mattina', start: '09:00', end: '12:00' }]
  );

  assert.ok(insights.every(insight => insight.id !== 'window-outside'));
});

test('con soli profitti non parla di rapporto ma di assenza di perdite', () => {
  const average = buildInsights([trade('01', '10:00', 100), trade('02', '10:00', 200)], []).find(
    insight => insight.id === 'average'
  );

  assert.match(text(average!), /Non hai ancora registrato perdite/);
});
