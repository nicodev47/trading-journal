import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OUT_OF_SESSION_NAME,
  PRE_SESSION_NAME,
  isAutomaticWindowName,
  getBestOperatingWindow,
  getOperatingWindowName,
} from '../src/lib/operating-windows.ts';
import { LEGACY_WINDOWS } from '../src/lib/preferences.ts';

const makeTrade = (time: string, pnl: number) =>
  ({
    id: `${time}-${pnl}`,
    pair: 'NQ',
    direction: 'long',
    entryDate: `2026-01-05T${time}:00`,
    exitDate: `2026-01-05T${time}:00`,
    pnl,
    commission: 0,
  }) as never;

const custom = [
  { id: 'w1', name: 'Londra', start: '09:00', end: '12:00' },
  { id: 'w2', name: 'New York', start: '15:30', end: '18:00' },
];

test('una finestra personalizzata riconosce i trade al suo interno', () => {
  assert.equal(getOperatingWindowName(makeTrade('10:15', 100), custom), 'Londra');
  assert.equal(getOperatingWindowName(makeTrade('15:30', 100), custom), 'New York');
});

test('un trade fuori da tutte le finestre viene contato come fuori sessione', () => {
  assert.equal(OUT_OF_SESSION_NAME, 'Fuori sessione');
  assert.equal(getOperatingWindowName(makeTrade('13:00', 100), custom), 'Fuori sessione');
  assert.equal(getOperatingWindowName(makeTrade('18:00', 100), custom), 'Fuori sessione');
});

test('fuori sessione non può essere la finestra migliore e non causa errori', () => {
  assert.equal(getBestOperatingWindow([makeTrade('13:00', 100)], custom), null);

  const best = getBestOperatingWindow(
    [makeTrade('10:00', 50), makeTrade('13:00', 900)],
    custom
  );

  assert.equal(best?.name, 'Londra');
});

test('senza finestre definite nessun trade è fuori sessione', () => {
  assert.notEqual(getOperatingWindowName(makeTrade('03:10', 10), []), 'Fuori sessione');
  assert.notEqual(getOperatingWindowName(makeTrade('23:59', 10), []), 'Fuori sessione');
});

test('senza finestre usa fasce automatiche di un\'ora', () => {
  assert.equal(getOperatingWindowName(makeTrade('15:35', 100), []), '15:00–16:00');
});

test('la finestra migliore è quella con il risultato più alto', () => {
  const trades = [
    makeTrade('10:00', 50),
    makeTrade('10:30', 70),
    makeTrade('16:00', 400),
    makeTrade('16:10', -100),
  ];
  const best = getBestOperatingWindow(trades, custom);
  assert.equal(best?.name, 'New York');
  assert.equal(best?.pnl, 300);
  assert.equal(best?.description, '15:30–18:00');
});

test('le finestre legacy riproducono il comportamento attuale', () => {
  assert.equal(getOperatingWindowName(makeTrade('15:40', 10), LEGACY_WINDOWS), 'Inizio sessione');
  assert.equal(getOperatingWindowName(makeTrade('23:50', 10), LEGACY_WINDOWS), 'Late New York / Asia');
  assert.equal(getOperatingWindowName(makeTrade('03:00', 10), LEGACY_WINDOWS), 'Sessione di Londra');
});

test('prima dell\'inizio della prima finestra il trade è pre sessione', () => {
  assert.equal(PRE_SESSION_NAME, 'Pre sessione');
  assert.equal(getOperatingWindowName(makeTrade('08:59', 100), custom), 'Pre sessione');
  assert.equal(getOperatingWindowName(makeTrade('00:00', 100), custom), 'Pre sessione');
});

test('tra due finestre e dopo l\'ultima il trade è fuori sessione, non pre sessione', () => {
  assert.equal(getOperatingWindowName(makeTrade('13:00', 100), custom), 'Fuori sessione');
  assert.equal(getOperatingWindowName(makeTrade('19:30', 100), custom), 'Fuori sessione');
});

test('pre sessione non può essere la finestra migliore', () => {
  const best = getBestOperatingWindow(
    [makeTrade('10:00', 50), makeTrade('08:00', 900)],
    custom
  );

  assert.equal(best?.name, 'Londra');
  assert.equal(getBestOperatingWindow([makeTrade('08:00', 900)], custom), null);
});

test('isAutomaticWindowName riconosce pre sessione e fuori sessione', () => {
  assert.equal(isAutomaticWindowName('Pre sessione'), true);
  assert.equal(isAutomaticWindowName('Fuori sessione'), true);
  assert.equal(isAutomaticWindowName('Londra'), false);
});

test('senza finestre definite nessun trade è pre sessione', () => {
  assert.notEqual(getOperatingWindowName(makeTrade('01:00', 10), []), 'Pre sessione');
});

test('la finestra peggiore è quella con il risultato più basso', async () => {
  const { getWorstOperatingWindow } = await import('../src/lib/operating-windows.ts');
  const trades = [
    makeTrade('10:00', 50),
    makeTrade('10:30', 70),
    makeTrade('16:00', 400),
    makeTrade('16:10', -600),
  ];
  const worst = getWorstOperatingWindow(trades, custom);

  assert.equal(worst?.name, 'New York');
  assert.equal(worst?.pnl, -200);
});

test('la finestra peggiore ignora pre sessione e fuori sessione', async () => {
  const { getWorstOperatingWindow } = await import('../src/lib/operating-windows.ts');

  assert.equal(
    getWorstOperatingWindow([makeTrade('08:00', -900), makeTrade('13:00', -500)], custom),
    null
  );
  assert.equal(
    getWorstOperatingWindow([makeTrade('10:00', 50), makeTrade('13:00', -500)], custom)?.name,
    'Londra'
  );
});
