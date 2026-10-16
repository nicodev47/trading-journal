import type { Trade } from './types/trade';
import {
  calculateMaxDrawdown,
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
  | 'direzione';

export type Segment = string | { text: string; tone: 'profit' | 'loss' | 'strong' };

export interface Insight {
  id: string;
  topic: InsightTopic;
  segments: Segment[];
  trades?: Trade[];
  openTitle?: string;
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

const count = (value: number) => `${value} trade`;

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

  // Setup
  const setups = getStrategyRows(trades).filter(row => row.name !== 'Senza Setup');

  if (setups.length > 0) {
    const best = setups[0];
    const worst = setups.length > 1 ? setups[setups.length - 1] : null;

    insights.push({
      id: 'setup-best',
      topic: 'setup',
      segments: [
        'Setup migliore: ',
        strong(best.name),
        ' (',
        moneyTone(best.pnl),
        `, ${count(best.trades)}, win rate ${number(best.winRate, 0)}%).`,
      ],
      trades: trades.filter(trade => trade.strategy?.trim() === best.name),
      openTitle: `Setup ${best.name}`,
    });

    if (worst && worst.name !== best.name) {
      insights.push({
        id: 'setup-worst',
        topic: 'setup',
        segments: [
          'Setup peggiore: ',
          strong(worst.name),
          ' (',
          moneyTone(worst.pnl),
          `, ${count(worst.trades)}, win rate ${number(worst.winRate, 0)}%).`,
        ],
        trades: trades.filter(trade => trade.strategy?.trim() === worst.name),
        openTitle: `Setup ${worst.name}`,
      });
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
    name === description ? [strong(name)] : [strong(name), ` (${description})`];

  if (bestWindow) {
    insights.push({
      id: 'window-best',
      topic: 'orari',
      segments: [
        'Finestra operativa migliore: ',
        ...when(bestWindow.name, bestWindow.description),
        ', ',
        moneyTone(bestWindow.pnl),
        ` in ${count(bestWindow.tradeCount)}.`,
      ],
      trades: inWindow(bestWindow.name),
      openTitle: `Finestra ${bestWindow.name}`,
    });
  }

  if (worstWindow) {
    insights.push({
      id: 'window-worst',
      topic: 'orari',
      segments: [
        'Finestra operativa peggiore: ',
        ...when(worstWindow.name, worstWindow.description),
        ', ',
        moneyTone(worstWindow.pnl),
        ` in ${count(worstWindow.tradeCount)}.`,
      ],
      trades: inWindow(worstWindow.name),
      openTitle: `Finestra ${worstWindow.name}`,
    });
  }

  const outside = trades.filter(trade => {
    const name = getOperatingWindowName(trade, windows);

    return name === PRE_SESSION_NAME || name === OUT_OF_SESSION_NAME;
  });

  if (outside.length >= 3 && windows.length > 0) {
    const share = (outside.length / trades.length) * 100;

    insights.push({
      id: 'window-outside',
      topic: 'orari',
      segments: [
        'Trade fuori dalle finestre operative: ',
        strong(`${outside.length} su ${trades.length} (${number(share, 0)}%)`),
        ', risultato ',
        moneyTone(sum(outside)),
        '.',
      ],
      trades: outside,
      openTitle: 'Trade fuori finestra',
    });
  }

  // Weekdays
  const weekdays = groupBy(trades, trade => {
    const date = dateOf(trade);

    return date ? String(date.getDay()) : null;
  });
  const weekdayExtremes = extremes(weekdays);

  if (weekdayExtremes.best) {
    const { best, worst } = weekdayExtremes;
    const bestDay = WEEKDAYS[Number(best.key)];

    insights.push({
      id: 'weekday',
      topic: 'giorni',
      segments: [
        'Giorno della settimana migliore: ',
        strong(bestDay),
        ' (',
        moneyTone(best.pnl),
        `, ${count(best.items.length)})`,
        ...(worst && worst.key !== best.key
          ? [
              '. Peggiore: ',
              strong(WEEKDAYS[Number(worst.key)]),
              ' (',
              moneyTone(worst.pnl),
              `, ${count(worst.items.length)})`,
            ]
          : []),
        '.',
      ],
      trades: best.items,
      openTitle: `Trade del ${bestDay}`,
    });
  }

  // Months
  const months = groupBy(trades, trade => {
    const date = dateOf(trade);

    return date ? String(date.getMonth()) : null;
  });
  const monthExtremes = extremes(months);

  if (monthExtremes.best) {
    const { best, worst } = monthExtremes;

    insights.push({
      id: 'month',
      topic: 'mesi',
      segments: [
        'Mese migliore: ',
        strong(capitalize(MONTHS[Number(best.key)])),
        ' (',
        moneyTone(best.pnl),
        `, win rate ${number(best.winRate, 0)}%)`,
        ...(worst && worst.key !== best.key
          ? ['. Peggiore: ', strong(capitalize(MONTHS[Number(worst.key)])), ' (', moneyTone(worst.pnl), ')']
          : []),
        '.',
      ],
      trades: best.items,
      openTitle: `Trade di ${MONTHS[Number(best.key)]}`,
    });
  }

  // Streaks
  if (stats.longestWinStreak > 0 || stats.longestLoseStreak > 0) {
    const current =
      stats.streakType === 'winning'
        ? [' Serie in corso: ', strong(`${stats.currentStreak} win`), '.']
        : stats.streakType === 'losing'
          ? [' Serie in corso: ', strong(`${stats.currentStreak} loss`), '.']
          : [];

    insights.push({
      id: 'streak',
      topic: 'serie',
      segments: [
        'Serie massima: ',
        { text: `${stats.longestWinStreak} win`, tone: 'profit' },
        ' consecutive. Serie peggiore: ',
        { text: `${stats.longestLoseStreak} loss`, tone: 'loss' },
        ' consecutive.',
        ...current,
      ],
    });
  }

  // Risk
  const maxDrawdown = calculateMaxDrawdown(trades);

  if (maxDrawdown !== null) {
    const drawdown = Math.abs(maxDrawdown);

    insights.push({
      id: 'drawdown',
      topic: 'rischio',
      segments:
        drawdown === 0
          ? ['Drawdown massimo: ', strong('nessuno'), '.']
          : [
              'Drawdown massimo: ',
              { text: `${number(drawdown)} USD`, tone: 'loss' as const },
              totalPnl > 0 ? ` (${number((drawdown / totalPnl) * 100, 0)}% del profitto netto).` : '.',
            ],
    });
  }

  if (stats.avgWin > 0 && stats.avgLoss > 0) {
    insights.push({
      id: 'average',
      topic: 'rischio',
      segments: [
        'Media win: ',
        { text: `${number(stats.avgWin)} USD`, tone: 'profit' },
        '. Media loss: ',
        { text: `${number(stats.avgLoss)} USD`, tone: 'loss' },
        '. Rapporto media win / media loss: ',
        strong(number(stats.avgWin / stats.avgLoss)),
        '.',
      ],
    });
  } else if (stats.avgWin > 0) {
    insights.push({
      id: 'average',
      topic: 'rischio',
      segments: [
        'Media win: ',
        { text: `${number(stats.avgWin)} USD`, tone: 'profit' },
        '. Nessuna perdita registrata.',
      ],
    });
  }

  if (stats.bestDayPercentOfGross > 0) {
    insights.push({
      id: 'concentration',
      topic: 'rischio',
      segments: [
        'Il giorno migliore vale il ',
        strong(`${number(stats.bestDayPercentOfGross, 0)}%`),
        ' dei profitti lordi.',
      ],
    });
  }

  // Direction
  const longs = trades.filter(trade => trade.direction === 'long');
  const shorts = trades.filter(trade => trade.direction === 'short');

  if (longs.length > 0 && shorts.length > 0) {
    const longPnl = sum(longs);
    const shortPnl = sum(shorts);
    const weaker = longPnl < shortPnl ? 'long' : 'short';

    insights.push({
      id: 'direction',
      topic: 'direzione',
      segments: [
        `Long: ${count(longs.length)} (`,
        moneyTone(longPnl),
        `). Short: ${count(shorts.length)} (`,
        moneyTone(shortPnl),
        ').',
      ],
      trades: weaker === 'long' ? longs : shorts,
      openTitle: `Trade ${weaker}`,
    });
  }

  return insights;
}

export { isAutomaticWindowName };
