import type { Trade } from './types/trade';
import {
  calculateMaxDrawdown,
  calculateMaxProfit,
  calculateStatistics,
  calculateWinRate,
  getTradeOutcome,
  isValidStatTrade,
} from './calculations.ts';
import {
  getBestOperatingWindow,
  getOperatingWindowName,
  getWorstOperatingWindow,
  isAutomaticWindowName,
  OUT_OF_SESSION_NAME,
  PRE_SESSION_NAME,
} from './operating-windows.ts';
import type { OperatingWindowConfig } from './preferences.ts';
import { getStrategyRows } from './strategy-stats.ts';

export type InsightTopic =
  | 'setup'
  | 'orari'
  | 'giorni'
  | 'mesi'
  | 'serie'
  | 'rischio'
  | 'metriche'
  | 'direzione';

export type Segment = string | { text: string; tone: 'profit' | 'loss' | 'strong' };

export interface Insight {
  id: string;
  topic: InsightTopic;
  segments: Segment[];
}

const WEEKDAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

const net = (trade: Trade) => trade.pnl - trade.commission;

const dateOf = (trade: Trade) => {
  const date = new Date(trade.exitDate || trade.entryDate);

  return Number.isNaN(date.getTime()) ? null : date;
};

const sum = (trades: Trade[]) => trades.reduce((total, trade) => total + net(trade), 0);

const winRateOf = (trades: Trade[]) =>
  calculateWinRate(
    trades.filter(trade => getTradeOutcome(trade) === 'win').length,
    trades.filter(trade => getTradeOutcome(trade) === 'loss').length
  );

const number = (value: number, digits = 2) =>
  value.toLocaleString('it-IT', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const money = (value: number) => `${value > 0 ? '+' : ''}${number(value)} USD`;

const moneyTone = (value: number) => ({
  text: money(value),
  tone: value > 0 ? ('profit' as const) : value < 0 ? ('loss' as const) : ('strong' as const),
});

const strong = (text: string) => ({ text, tone: 'strong' as const });

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** "+8078,00 USD, 15 trade totali di cui 15 wins e 0 loss con un totale di winrate del 100%" */
function stat(items: Trade[]): Segment[] {
  const wins = items.filter(trade => getTradeOutcome(trade) === 'win').length;
  const losses = items.filter(trade => getTradeOutcome(trade) === 'loss').length;
  const total = items.length;

  return [
    moneyTone(sum(items)),
    `, ${total === 1 ? '1 trade totale' : `${total} trade totali`} di cui ${
      wins === 1 ? '1 win' : `${wins} wins`
    } e ${losses} loss con un totale di winrate del ${number(winRateOf(items), 0)}%`,
  ];
}

function groupBy(trades: Trade[], keyOf: (trade: Trade) => string | null) {
  const groups = new Map<string, Trade[]>();

  trades.forEach(trade => {
    const key = keyOf(trade);

    if (key !== null) groups.set(key, [...(groups.get(key) ?? []), trade]);
  });

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    items,
    pnl: sum(items),
    winRate: winRateOf(items),
  }));
}

const extremes = <T extends { pnl: number }>(rows: T[]) => {
  if (rows.length === 0) return { best: null, worst: null };

  const sorted = [...rows].sort((a, b) => b.pnl - a.pnl);

  return {
    best: sorted[0],
    worst: sorted.length > 1 ? sorted[sorted.length - 1] : null,
  };
};

/** Plain facts computed from the trades, one line each. */
export function buildInsights(
  allTrades: Trade[],
  windows: OperatingWindowConfig[]
): Insight[] {
  const trades = allTrades.filter(isValidStatTrade);

  if (trades.length === 0) return [];

  const insights: Insight[] = [];
  const stats = calculateStatistics(trades);
  const totalPnl = sum(trades);
  const add = (id: string, topic: InsightTopic, segments: Segment[]) =>
    insights.push({ id, topic, segments });

  // Setup
  const setups = getStrategyRows(trades).filter(row => row.name !== 'Senza Setup');
  const ofSetup = (name: string) => trades.filter(trade => trade.strategy?.trim() === name);

  if (setups.length > 0) {
    const best = setups[0];
    const worst = setups.length > 1 ? setups[setups.length - 1] : null;

    add('setup-best', 'setup', ['Setup migliore: ', strong(best.name), ', ', ...stat(ofSetup(best.name)), '.']);

    if (worst && worst.name !== best.name) {
      add('setup-worst', 'setup', ['Setup peggiore: ', strong(worst.name), ', ', ...stat(ofSetup(worst.name)), '.']);
    }
  }

  // Operating windows
  const bestWindow = getBestOperatingWindow(trades, windows);
  const worstWindowRaw = getWorstOperatingWindow(trades, windows);
  const worstWindow =
    worstWindowRaw && worstWindowRaw.name !== bestWindow?.name ? worstWindowRaw : null;
  const inWindow = (name: string) =>
    trades.filter(trade => getOperatingWindowName(trade, windows) === name);
  const when = (name: string, description: string) =>
    name === description ? [strong(name)] : [strong(name), ` ${description}`];

  if (bestWindow) {
    add('window-best', 'orari', [
      'Finestra operativa migliore: ',
      ...when(bestWindow.name, bestWindow.description),
      ', ',
      ...stat(inWindow(bestWindow.name)),
      '.',
    ]);
  }

  if (worstWindow) {
    add('window-worst', 'orari', [
      'Finestra operativa peggiore: ',
      ...when(worstWindow.name, worstWindow.description),
      ', ',
      ...stat(inWindow(worstWindow.name)),
      '.',
    ]);
  }

  const outside = trades.filter(trade => {
    const name = getOperatingWindowName(trade, windows);

    return name === PRE_SESSION_NAME || name === OUT_OF_SESSION_NAME;
  });

  if (outside.length >= 3 && windows.length > 0) {
    add('window-outside', 'orari', [
      'Trade fuori dalle finestre operative: ',
      strong(`${outside.length} su ${trades.length}, ${number((outside.length / trades.length) * 100, 0)}% dei trade`),
      ', ',
      ...stat(outside),
      '.',
    ]);
  }

  // Weekdays
  const weekdays = groupBy(trades, trade => {
    const date = dateOf(trade);

    return date ? String(date.getDay()) : null;
  });
  const weekdayExtremes = extremes(weekdays);

  if (weekdayExtremes.best) {
    const { best, worst } = weekdayExtremes;

    add('weekday-best', 'giorni', [
      'Giorno della settimana migliore: ',
      strong(WEEKDAYS[Number(best.key)]),
      ', ',
      ...stat(best.items),
      '.',
    ]);

    if (worst && worst.key !== best.key) {
      add('weekday-worst', 'giorni', [
        'Giorno della settimana peggiore: ',
        strong(WEEKDAYS[Number(worst.key)]),
        ', ',
        ...stat(worst.items),
        '.',
      ]);
    }
  }

  // Months
  const months = groupBy(trades, trade => {
    const date = dateOf(trade);

    return date ? String(date.getMonth()) : null;
  });
  const monthExtremes = extremes(months);

  if (monthExtremes.best) {
    const { best, worst } = monthExtremes;

    add('month-best', 'mesi', [
      'Mese migliore: ',
      strong(capitalize(MONTHS[Number(best.key)])),
      ', ',
      ...stat(best.items),
      '.',
    ]);

    if (worst && worst.key !== best.key) {
      add('month-worst', 'mesi', [
        'Mese peggiore: ',
        strong(capitalize(MONTHS[Number(worst.key)])),
        ', ',
        ...stat(worst.items),
        '.',
      ]);
    }
  }

  // Streaks
  if (stats.longestWinStreak > 0 || stats.longestLoseStreak > 0) {
    add('streak-best', 'serie', [
      'Serie massima: ',
      { text: `${stats.longestWinStreak} win`, tone: 'profit' },
      ' consecutive.',
    ]);
    add('streak-worst', 'serie', [
      'Serie peggiore: ',
      { text: `${stats.longestLoseStreak} loss`, tone: 'loss' },
      ' consecutive.',
      ...(stats.streakType === 'winning'
        ? [' Serie in corso: ', strong(`${stats.currentStreak} win`), '.']
        : stats.streakType === 'losing'
          ? [' Serie in corso: ', strong(`${stats.currentStreak} loss`), '.']
          : []),
    ]);
  }

  // Risk
  if (stats.avgWin > 0) {
    add('average-win', 'rischio', ['Media win: ', { text: `${number(stats.avgWin)} USD`, tone: 'profit' }, '.']);
  }

  if (stats.avgLoss > 0) {
    add('average-loss', 'rischio', ['Media loss: ', { text: `${number(stats.avgLoss)} USD`, tone: 'loss' }, '.']);
  } else if (stats.avgWin > 0) {
    add('average-loss', 'rischio', ['Media loss: ', strong('nessuna perdita registrata'), '.']);
  }

  // Metrics
  const maxProfit = calculateMaxProfit(trades);
  const maxDrawdown = calculateMaxDrawdown(trades);

  if (maxProfit !== null && maxProfit > 0) {
    add('max-profit', 'metriche', [
      'Profitto massimo raggiunto: ',
      { text: `${number(maxProfit)} USD`, tone: 'profit' },
      '.',
    ]);
  }

  if (maxDrawdown !== null) {
    const drawdown = Math.abs(maxDrawdown);

    add(
      'drawdown',
      'metriche',
      drawdown === 0
        ? ['Drawdown massimo: ', strong('nessuno'), '.']
        : ['Drawdown massimo: ', { text: `${number(drawdown)} USD`, tone: 'loss' }, '.']
    );
  }

  // Direction
  const longs = trades.filter(trade => trade.direction === 'long');
  const shorts = trades.filter(trade => trade.direction === 'short');

  if (longs.length > 0 && shorts.length > 0) {
    add('direction-long', 'direzione', ['Long: ', ...stat(longs), '.']);
    add('direction-short', 'direzione', ['Short: ', ...stat(shorts), '.']);
  }

  return insights;
}

export { isAutomaticWindowName };
