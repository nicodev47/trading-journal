import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateEclipseScore,
  calculateExpectancy,
  calculateMaxDrawdown,
  calculateProfitFactorDetails,
  calculateOperationalFrequency,
  calculateProfitFactor,
  calculateStatistics,
  classifyPnl,
  filterCalendarTrades,
  formatProfitFactorBreakdown,
  formatProfitFactorSubtitle,
  formatProfitFactorValue,
  getDayData,
  getEquityCurveData,
  getTradeOutcome,
  isLosingTrade,
  isMissedTrade,
  isValidStatTrade,
  isWinningTrade,
  MIN_TRADES_PER_WEEK,
} from '../src/lib/calculations.ts';
import type { Trade } from '../src/lib/types/trade.ts';

function makeTrade(
  pnl: number,
  commission = 0,
  index = 0,
  direction: Trade['direction'] = 'long'
): Trade {
  const date = `2026-01-${String(index + 1).padStart(2, '0')}T10:00:00`;

  return {
    id: String(index),
    pair: 'NQ',
    direction,
    entryPrice: 0,
    exitPrice: 0,
    lotSize: 1,
    stopLoss: 0,
    takeProfit: 0,
    entryDate: date,
    exitDate: date,
    pips: 0,
    pnl,
    commission,
    riskReward: 0,
    screenshots: [],
    tags: [],
    isFavorite: false,
    strategy: '',
    notes: '',
    emotionalState: 'neutral',
    setupRating: 0,
    createdAt: date,
    updatedAt: date,
  };
}

test('un trade Long positivo conta come Long e vittoria', () => {
  const trade = makeTrade(100, 0, 0, 'long');
  const stats = calculateStatistics([trade]);

  assert.equal(isValidStatTrade(trade), true);
  assert.equal(isWinningTrade(trade), true);
  assert.equal(getTradeOutcome(trade), 'win');
  assert.equal(stats.totalTrades, 1);
  assert.equal(stats.winningTrades, 1);
  assert.equal([trade].filter(isValidStatTrade).filter((item) => item.direction === 'long').length, 1);
});

test('un trade Short negativo conta come Short e perdita', () => {
  const trade = makeTrade(-100, 0, 0, 'short');
  const stats = calculateStatistics([trade]);

  assert.equal(isValidStatTrade(trade), true);
  assert.equal(isLosingTrade(trade), true);
  assert.equal(getTradeOutcome(trade), 'loss');
  assert.equal(stats.losingTrades, 1);
  assert.equal([trade].filter(isValidStatTrade).filter((item) => item.direction === 'short').length, 1);
});

test('un trade Long a zero è missed e non modifica le statistiche', () => {
  const win = makeTrade(100, 0, 0, 'short');
  const missedLong = makeTrade(0, 5, 1, 'long');
  const trades = [win, missedLong];
  const stats = calculateStatistics(trades);

  assert.equal(isMissedTrade(missedLong), true);
  assert.equal(trades.filter(isValidStatTrade).filter((trade) => trade.direction === 'long').length, 0);
  assert.equal(stats.totalTrades, 1);
  assert.equal(stats.winningTrades, 1);
  assert.equal(stats.losingTrades, 0);
  assert.equal(stats.winRate, 100);
  assert.equal(stats.totalPnl, 100);
});

test('un trade Short a zero è missed e non modifica nessuna statistica', () => {
  const missedShort = makeTrade(-0, 12, 0, 'short');
  const stats = calculateStatistics([missedShort]);
  const dayData = getDayData([missedShort], '2026-01-01');

  assert.equal(isMissedTrade(missedShort), true);
  assert.equal([missedShort].filter(isValidStatTrade).filter((trade) => trade.direction === 'short').length, 0);
  assert.equal(stats.totalTrades, 0);
  assert.equal(stats.totalPnl, 0);
  assert.equal(stats.totalPips, 0);
  assert.equal(stats.winRate, 0);
  assert.deepEqual(dayData.trades, [missedShort]);
  assert.equal(dayData.tradeCount, 1);
  assert.equal(dayData.validTradeCount, 0);
  assert.equal(dayData.totalPnl, 0);
  assert.deepEqual(getEquityCurveData([missedShort]), []);
});

test('5 win, 5 loss e 10 missed producono 10 trade statistici e winrate 50%', () => {
  const wins = Array.from({ length: 5 }, (_, index) =>
    makeTrade(100, 0, index, 'long')
  );
  const losses = Array.from({ length: 5 }, (_, index) =>
    makeTrade(-100, 0, index + 5, 'short')
  );
  const missed = Array.from({ length: 10 }, (_, index) =>
    makeTrade(0, 0, index + 10, index % 2 === 0 ? 'long' : 'short')
  );
  const trades = [...wins, ...losses, ...missed];
  const validTrades = trades.filter(isValidStatTrade);
  const stats = calculateStatistics(trades);

  assert.equal(stats.totalTrades, 10);
  assert.equal(stats.winningTrades, 5);
  assert.equal(stats.losingTrades, 5);
  assert.equal(stats.breakEvenTrades, 10);
  assert.equal(stats.winRate, 50);
  assert.equal(validTrades.filter((trade) => trade.direction === 'long').length, 5);
  assert.equal(validTrades.filter((trade) => trade.direction === 'short').length, 5);
});

test('normalizza -0 e i residui inferiori alla tolleranza', () => {
  assert.equal(classifyPnl(-0), 'missed');
  assert.equal(classifyPnl(0.0000005), 'missed');
  assert.equal(classifyPnl(-0.0000005), 'missed');
  assert.equal(classifyPnl(0.000001), 'win');
  assert.equal(classifyPnl(-0.000001), 'loss');
});

test('nessun trade produce statistiche a zero', () => {
  const stats = calculateStatistics([]);

  assert.equal(stats.totalTrades, 0);
  assert.equal(stats.winRate, 0);
});

test('le serie contano i trade consecutivi e non le giornate positive', () => {
  const trades = [
    makeTrade(100, 0, 0),
    makeTrade(50, 0, 1),
    makeTrade(-25, 0, 2),
    makeTrade(75, 0, 3),
    makeTrade(80, 0, 4),
    makeTrade(90, 0, 5),
  ];

  trades[0].exitDate = '2026-01-01T09:00:00';
  trades[1].exitDate = '2026-01-01T10:00:00';
  trades[2].exitDate = '2026-01-02T09:00:00';
  trades[3].exitDate = '2026-01-03T09:00:00';
  trades[4].exitDate = '2026-01-03T10:00:00';
  trades[5].exitDate = '2026-01-03T11:00:00';

  const stats = calculateStatistics(trades);

  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.streakType, 'winning');
  assert.equal(stats.longestWinStreak, 3);
});

test('il calendario nasconde o mostra i trade a zero senza cambiare il P&L', () => {
  const positiveTrade = makeTrade(100, 0, 0, 'long');
  const zeroTrade = makeTrade(0, 0, 0, 'short');
  const trades = [positiveTrade, zeroTrade];

  const hiddenDay = getDayData(
    filterCalendarTrades(trades, false),
    '2026-01-01'
  );
  const visibleDay = getDayData(
    filterCalendarTrades(trades, true),
    '2026-01-01'
  );

  assert.equal(hiddenDay.tradeCount, 1);
  assert.equal(hiddenDay.totalPnl, 100);
  assert.equal(visibleDay.tradeCount, 2);
  assert.equal(visibleDay.validTradeCount, 1);
  assert.equal(visibleDay.totalPnl, 100);
  assert.equal(calculateStatistics(trades).totalTrades, 1);
  assert.equal(calculateStatistics(trades).winRate, 100);
});

test('una giornata con soli trade a zero appare vuota quando l’opzione è disattivata', () => {
  const zeroTrade = makeTrade(0);
  const hiddenDay = getDayData(
    filterCalendarTrades([zeroTrade], false),
    '2026-01-01'
  );
  const visibleDay = getDayData(
    filterCalendarTrades([zeroTrade], true),
    '2026-01-01'
  );

  assert.equal(hiddenDay.tradeCount, 0);
  assert.equal(visibleDay.tradeCount, 1);
  assert.equal(visibleDay.totalPnl, 0);
});

test('Profit Factor: 1.000 USD di profitti e 500 USD di perdite producono 2,00', () => {
  const trades = [makeTrade(1_000), makeTrade(-500, 0, 1)];

  assert.equal(calculateProfitFactor(trades), 2);
});

test('Profit Factor condiviso: solo profitti produce infinito positivo', () => {
  const result = calculateProfitFactorDetails([makeTrade(500), makeTrade(300, 0, 1)]);

  assert.deepEqual(result, {
    value: Infinity,
    grossProfit: 800,
    grossLoss: 0,
    state: 'infinite',
  });
  assert.equal(formatProfitFactorValue(result), '∞');
  assert.equal(formatProfitFactorSubtitle(result), 'Nessuna loss registrata');
  assert.equal(
    formatProfitFactorBreakdown(result),
    '800,00 USD profit · 0,00 USD loss'
  );
});

test('Profit Factor condiviso: i profitti dello screenshot producono infinito', () => {
  const result = calculateProfitFactorDetails([makeTrade(8_819.5)]);

  assert.equal(formatProfitFactorValue(result), '∞');
  assert.equal(formatProfitFactorSubtitle(result), 'Nessuna loss registrata');
  assert.equal(
    formatProfitFactorBreakdown(result),
    '8.819,50 USD profit · 0,00 USD loss'
  );
});

test('Profit Factor condiviso: profitti e perdite producono rapporto e lordi', () => {
  const result = calculateProfitFactorDetails([makeTrade(500), makeTrade(-250, 0, 1)]);

  assert.deepEqual(result, {
    value: 2,
    grossProfit: 500,
    grossLoss: 250,
    state: 'positive',
  });
  assert.equal(formatProfitFactorValue(result), '2,00');
  assert.equal(formatProfitFactorSubtitle(result), 'Rapporto profitti / perdite');
  assert.equal(
    formatProfitFactorBreakdown(result),
    '500,00 USD profit · 250,00 USD loss'
  );
});

test('Profit Factor condiviso: sole perdite produce zero negativo', () => {
  const result = calculateProfitFactorDetails([makeTrade(-200), makeTrade(-300, 0, 1)]);

  assert.deepEqual(result, {
    value: 0,
    grossProfit: 0,
    grossLoss: 500,
    state: 'negative',
  });
  assert.equal(formatProfitFactorValue(result), '0,00');
  assert.equal(formatProfitFactorSubtitle(result), 'Nessun profitto registrato');
  assert.equal(
    formatProfitFactorBreakdown(result),
    '0,00 USD profit · 500,00 USD loss'
  );
});

test('Profit Factor condiviso: soli trade a zero produce stato vuoto', () => {
  const result = calculateProfitFactorDetails([makeTrade(0), makeTrade(-0, 0, 1)]);

  assert.deepEqual(result, {
    value: null,
    grossProfit: 0,
    grossLoss: 0,
    state: 'empty',
  });
  assert.equal(formatProfitFactorValue(result), '—');
  assert.equal(formatProfitFactorSubtitle(result), 'Nessun dato disponibile');
  assert.equal(formatProfitFactorBreakdown(result), 'Nessun dato disponibile');
});

test('Expectancy: 600 USD su 3 trade validi producono +200,00 USD', () => {
  const trades = [
    makeTrade(400),
    makeTrade(300, 0, 1),
    makeTrade(-100, 0, 2),
  ];

  assert.equal(calculateExpectancy(trades), 200);
});

test('i trade a P&L zero non modificano Profit Factor o Expectancy', () => {
  const decisiveTrades = [makeTrade(300), makeTrade(-100, 0, 1)];
  const tradesWithZero = [...decisiveTrades, makeTrade(0, 50, 2)];

  assert.equal(calculateProfitFactor(tradesWithZero), calculateProfitFactor(decisiveTrades));
  assert.equal(calculateExpectancy(tradesWithZero), calculateExpectancy(decisiveTrades));
});

test('Profit Factor è infinito quando sono presenti solo profitti', () => {
  assert.equal(calculateProfitFactor([makeTrade(100), makeTrade(50, 0, 1)]), Infinity);
});

test('senza trade validi Profit Factor ed Expectancy non hanno un valore', () => {
  const zeroTrades = [makeTrade(0), makeTrade(-0, 0, 1)];

  assert.equal(calculateProfitFactor(zeroTrades), null);
  assert.equal(calculateExpectancy(zeroTrades), null);
});

test('con sole perdite Profit Factor è 0,00', () => {
  assert.equal(calculateProfitFactor([makeTrade(-250)]), 0);
});

test('Expectancy normalizza il risultato -0', () => {
  const expectancy = calculateExpectancy([makeTrade(100), makeTrade(-100, 0, 1)]);

  assert.equal(expectancy, 0);
  assert.equal(Object.is(expectancy, -0), false);
});

test('Drawdown massimo: equity sempre crescente produce zero', () => {
  const trades = [
    makeTrade(500),
    makeTrade(300, 0, 1),
    makeTrade(200, 0, 2),
  ];

  assert.equal(calculateMaxDrawdown(trades), 0);
});

test('Drawdown massimo: un calo dal massimo mantiene il segno negativo', () => {
  const trades = [
    makeTrade(500),
    makeTrade(500, 0, 1),
    makeTrade(-300, 0, 2),
  ];

  assert.equal(calculateMaxDrawdown(trades), -300);
});

test('Drawdown massimo: considera il calo peggiore dopo un nuovo massimo', () => {
  const trades = [
    makeTrade(500),
    makeTrade(-200, 0, 1),
    makeTrade(800, 0, 2),
    makeTrade(-600, 0, 3),
  ];

  assert.equal(calculateMaxDrawdown(trades), -600);
});

test('Drawdown massimo: esclude i trade a P&L zero', () => {
  const decisiveTrades = [makeTrade(500), makeTrade(-200, 0, 2)];
  const zeroTrade = makeTrade(0, 0, 1);

  assert.equal(
    calculateMaxDrawdown([...decisiveTrades, zeroTrade]),
    calculateMaxDrawdown(decisiveTrades)
  );
});

test('Drawdown massimo: ordina per data e orario di uscita', () => {
  const loss = makeTrade(-300, 0, 0);
  const firstWin = makeTrade(500, 0, 1);
  const secondWin = makeTrade(500, 0, 2);
  loss.exitDate = '2026-01-01T11:00:00';
  firstWin.exitDate = '2026-01-01T09:00:00';
  secondWin.exitDate = '2026-01-01T10:00:00';

  assert.equal(calculateMaxDrawdown([loss, secondWin, firstWin]), -300);
});

test('Drawdown massimo: gestisce date mancanti o orari non validi', () => {
  const malformedTime = makeTrade(100, 0, 0);
  const missingDates = makeTrade(-50, 0, 1);
  malformedTime.exitDate = '2026-01-01Tnon-valido';
  missingDates.exitDate = '';
  missingDates.entryDate = '';

  assert.equal(calculateMaxDrawdown([missingDates, malformedTime]), -50);
});

test('Drawdown massimo: senza trade validi non ha un valore', () => {
  assert.equal(calculateMaxDrawdown([makeTrade(0), makeTrade(-0, 0, 1)]), null);
});

function makeDatedTrades(date: string, count: number, startIndex: number): Trade[] {
  return Array.from({ length: count }, (_, index) => {
    const trade = makeTrade(100, 0, startIndex + index);
    const dateTime = `${date}T10:00:00`;

    return { ...trade, entryDate: dateTime, exitDate: dateTime };
  });
}

test('Frequenza operativa: 3 settimane su 6 producono 50/100', () => {
  const trades = [
    ...makeDatedTrades('2026-01-05', MIN_TRADES_PER_WEEK, 0),
    ...makeDatedTrades('2026-01-19', MIN_TRADES_PER_WEEK, 3),
    ...makeDatedTrades('2026-02-09', MIN_TRADES_PER_WEEK, 6),
  ];
  const frequency = calculateOperationalFrequency(trades, 1);

  assert.deepEqual(frequency, {
    score: 50,
    weeksWithMinimumTrades: 3,
    totalWeeks: 6,
  });
});

test('Frequenza operativa: 4 settimane su 4 producono 100/100', () => {
  const trades = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']
    .flatMap((date, index) =>
      makeDatedTrades(date, MIN_TRADES_PER_WEEK, index * MIN_TRADES_PER_WEEK)
    );

  assert.equal(calculateOperationalFrequency(trades, 1).score, 100);
});

test('Frequenza operativa con trade in una sola settimana conta una settimana totale', () => {
  const frequency = calculateOperationalFrequency(
    makeDatedTrades('2026-01-05', MIN_TRADES_PER_WEEK, 0),
    1
  );

  assert.deepEqual(frequency, {
    score: 100,
    weeksWithMinimumTrades: 1,
    totalWeeks: 1,
  });
});

test('Frequenza operativa: 1 settimana su 4 produce 25/100', () => {
  const trades = [
    ...makeDatedTrades('2026-01-05', MIN_TRADES_PER_WEEK, 0),
    ...makeDatedTrades('2026-01-26', 1, MIN_TRADES_PER_WEEK),
  ];
  const frequency = calculateOperationalFrequency(trades, 1);

  assert.equal(frequency.score, 25);
  assert.equal(frequency.weeksWithMinimumTrades, 1);
  assert.equal(frequency.totalWeeks, 4);
});

test('Frequenza operativa senza trade validi produce 0/100', () => {
  assert.deepEqual(calculateOperationalFrequency([makeTrade(0)], 1), {
    score: 0,
    weeksWithMinimumTrades: 0,
    totalWeeks: 0,
  });
});

test('Frequenza operativa: 3 trade validi rendono valida la settimana', () => {
  assert.equal(
    calculateOperationalFrequency(
      makeDatedTrades('2026-01-05', MIN_TRADES_PER_WEEK, 0),
      1
    ).score,
    100
  );
});

test('Frequenza operativa: 2 trade validi non rendono valida la settimana', () => {
  assert.equal(
    calculateOperationalFrequency(
      makeDatedTrades('2026-01-05', MIN_TRADES_PER_WEEK - 1, 0),
      1
    ).score,
    0
  );
});

test('Frequenza operativa: 3 trade validi più trade a zero sono validi', () => {
  const trades = [
    ...makeDatedTrades('2026-01-05', MIN_TRADES_PER_WEEK, 0),
    { ...makeDatedTrades('2026-01-05', 1, MIN_TRADES_PER_WEEK)[0], pnl: 0 },
  ];

  assert.equal(calculateOperationalFrequency(trades, 1).score, 100);
});

test('Frequenza operativa: 2 trade validi più trade a zero non sono validi', () => {
  const trades = [
    ...makeDatedTrades('2026-01-05', MIN_TRADES_PER_WEEK - 1, 0),
    { ...makeDatedTrades('2026-01-05', 1, MIN_TRADES_PER_WEEK)[0], pnl: 0 },
  ];

  assert.equal(calculateOperationalFrequency(trades, 1).score, 0);
});

test('Frequenza operativa rispetta l’impostazione di inizio settimana', () => {
  const trades = [
    ...makeDatedTrades('2026-01-04', 2, 0),
    ...makeDatedTrades('2026-01-10', 2, 2),
  ];

  assert.equal(calculateOperationalFrequency(trades, 0).score, 100);
  assert.equal(calculateOperationalFrequency(trades, 1).score, 0);
});

test('Eclipse Score arrotonda solo la media finale a una cifra decimale', () => {
  assert.equal(calculateEclipseScore([100, 100, 50, 100]), 87.5);
});

test('Eclipse Score usa la nuova frequenza con soglia di 3 trade', () => {
  const frequency = calculateOperationalFrequency(
    makeDatedTrades('2026-01-05', MIN_TRADES_PER_WEEK, 0),
    1
  );

  assert.equal(frequency.score, 100);
  assert.equal(calculateEclipseScore([100, 100, frequency.score, 100]), 100);
});
