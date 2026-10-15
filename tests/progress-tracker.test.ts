import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildHeatmap,
  computeStreaks,
  getDayLevel,
  getLevelsByDate,
  summarizeYear,
} from '../src/lib/progress-tracker.ts';

const entry = (date: string, parts: Partial<{ a: string; o: string; c: number }> = {}) =>
  ({
    id: date,
    date,
    analysis: parts.a ?? '',
    observations: parts.o ?? '',
    caseStudies: Array.from({ length: parts.c ?? 0 }, (_, index) => ({
      id: `c${index}`,
      title: 't',
      notes: '',
      screenshots: [],
    })),
    createdAt: '',
    updatedAt: '',
  }) as never;

test('il livello conta le parti compilate del giorno', () => {
  assert.equal(getDayLevel(undefined, 0), 0);
  assert.equal(getDayLevel(entry('2026-06-01', { a: 'x' }), 0), 1);
  assert.equal(getDayLevel(entry('2026-06-01', { a: 'x', o: 'y', c: 1 }), 2), 4);
  assert.equal(getDayLevel(entry('2026-06-01', { a: '   ' }), 0), 0);
});

test('un giorno con sole operazioni mancate ha livello 1', () => {
  const levels = getLevelsByDate([], [{ date: '2026-06-02' }, { date: '2026-06-02' }]);

  assert.equal(levels.get('2026-06-02'), 1);
});

test('la griglia parte da lunedì e copre tutto l’anno', () => {
  const weeks = buildHeatmap(2026, new Map([['2026-06-03', 3]]));

  assert.equal(weeks[0].length, 7);
  assert.equal(weeks[0][0].date, '2025-12-29');
  assert.equal(weeks[0][0].inYear, false);
  assert.equal(weeks[0][3].date, '2026-01-01');
  assert.equal(weeks[0][3].inYear, true);
  assert.ok(weeks.flat().some(cell => cell.date === '2026-12-31'));
  assert.equal(weeks.flat().find(cell => cell.date === '2026-06-03')?.level, 3);
});

test('la serie salta i fine settimana e non punisce oggi', () => {
  // 2026-06-01 è un lunedì
  const levels = new Map([
    ['2026-05-28', 1], // gio
    ['2026-05-29', 1], // ven
    ['2026-06-01', 1], // lun
    ['2026-06-02', 1], // mar
  ]);
  const wednesday = new Date(2026, 5, 3, 10);

  assert.deepEqual(computeStreaks(levels, wednesday), { current: 4, longest: 4 });
});

test('un giorno feriale mancante interrompe la serie', () => {
  const levels = new Map([
    ['2026-05-27', 1], // mer
    ['2026-05-29', 1], // ven (manca giovedì)
    ['2026-06-01', 1],
  ]);

  assert.deepEqual(computeStreaks(levels, new Date(2026, 5, 1, 10)), { current: 2, longest: 2 });
});

test('senza voci le serie sono zero', () => {
  assert.deepEqual(computeStreaks(new Map(), new Date(2026, 5, 1)), { current: 0, longest: 0 });
});

test('riepilogo annuale', () => {
  const summary = summarizeYear(
    2026,
    new Map([
      ['2026-06-01', 4],
      ['2026-06-02', 2],
      ['2025-12-31', 4],
    ])
  );

  assert.deepEqual(summary, { daysWithEntry: 2, completion: 75 });
});
