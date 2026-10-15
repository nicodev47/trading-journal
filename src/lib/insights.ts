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
  /** Optional suggestion, only when there is enough data to support it. */
  tip?: Segment[];
  trades?: Trade[];
  openTitle?: string;
}

/** Below this many trades a pattern is shown but no suggestion is made. */
export const MIN_TRADES_FOR_TIPS = 5;

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

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

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

/** Natural-language observations (and cautious tips) computed from the trades. */
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
        'Il setup più redditizio è ',
        strong(best.name),
        ': ',
        moneyTone(best.pnl),
        ` con il ${number(best.winRate, 0)}% di win rate su ${plural(best.trades, 'trade', 'trade')}.`,
      ],
      tip:
        best.trades >= MIN_TRADES_FOR_TIPS && best.pnl > 0 && setups.length > 1
          ? ['È il setup su cui hai più riscontri: potresti dargli la priorità quando ci sono più occasioni.']
          : undefined,
      trades: trades.filter(trade => trade.strategy?.trim() === best.name),
      openTitle: `Setup ${best.name}`,
    });

    if (worst && worst.name !== best.name) {
      insights.push({
        id: 'setup-worst',
        topic: 'setup',
        segments: [
          'Il più debole è ',
          strong(worst.name),
          ': ',
          moneyTone(worst.pnl),
          ` con il ${number(worst.winRate, 0)}% di win rate su ${plural(worst.trades, 'trade', 'trade')}.`,
        ],
        tip:
          worst.trades >= MIN_TRADES_FOR_TIPS && worst.pnl < 0
            ? ['Prova a rivedere le regole di ingresso di questo setup o a ridurne la frequenza finché non capisci cosa non funziona.']
            : undefined,
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

  if (bestWindow) {
    insights.push({
      id: 'window-best',
      topic: 'orari',
      segments: [
        'Operi meglio nella finestra ',
        strong(bestWindow.name),
        bestWindow.name === bestWindow.description ? ': ' : ` (${bestWindow.description}): `,
        moneyTone(bestWindow.pnl),
        ` su ${plural(bestWindow.tradeCount, 'trade', 'trade')}.`,
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
        'La più debole è ',
        strong(worstWindow.name),
        worstWindow.name === worstWindow.description ? ': ' : ` (${worstWindow.description}): `,
        moneyTone(worstWindow.pnl),
        ` su ${plural(worstWindow.tradeCount, 'trade', 'trade')}.`,
      ],
      tip:
        worstWindow.tradeCount >= MIN_TRADES_FOR_TIPS && worstWindow.pnl < 0
          ? ['Se non è una fascia che ti appartiene, valuta di operarci meno o con più selettività.']
          : undefined,
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
    const outsidePnl = sum(outside);

    insights.push({
      id: 'window-outside',
      topic: 'orari',
      segments: [
        strong(`${outside.length} trade (${number(share, 0)}%)`),
        ' sono fuori dalle tue finestre operative e hanno chiuso con ',
        moneyTone(outsidePnl),
        '.',
      ],
      tip:
        share >= 25 && outsidePnl < 0
          ? ['Controlla se stai rispettando gli orari che ti sei dato: qui stai perdendo.']
          : undefined,
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

    insights.push({
      id: 'weekday',
      topic: 'giorni',
      segments: [
        'Il giorno della settimana migliore è ',
        strong(WEEKDAYS[Number(best.key)]),
        ' (',
        moneyTone(best.pnl),
        ` su ${plural(best.items.length, 'trade', 'trade')})`,
        ...(worst && worst.key !== best.key
          ? [', il più debole ', strong(WEEKDAYS[Number(worst.key)]), ' (', moneyTone(worst.pnl), ')']
          : []),
        '.',
      ],
      tip:
        worst && worst.key !== best.key && worst.items.length >= MIN_TRADES_FOR_TIPS && worst.pnl < 0
          ? [`Il ${WEEKDAYS[Number(worst.key)]} non ti sta aiutando: potresti operare meno o con dimensioni ridotte.`]
          : undefined,
      trades: best.items,
      openTitle: `Trade del ${WEEKDAYS[Number(best.key)]}`,
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
        strong(capitalize(MONTHS[Number(best.key)])),
        ' è il mese migliore (',
        moneyTone(best.pnl),
        `, win rate ${number(best.winRate, 0)}%)`,
        ...(worst && worst.key !== best.key
          ? [', il più debole ', strong(MONTHS[Number(worst.key)]), ' (', moneyTone(worst.pnl), ')']
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
        ? [strong(`${stats.currentStreak} win`), ' di fila']
        : stats.streakType === 'losing'
          ? [strong(`${stats.currentStreak} loss`), ' di fila']
          : ['nessuna serie in corso'];

    insights.push({
      id: 'streak',
      topic: 'serie',
      segments: [
        'La tua serie più lunga è di ',
        { text: `${stats.longestWinStreak} win`, tone: 'profit' },
        ' consecutive e la peggiore di ',
        { text: `${stats.longestLoseStreak} loss`, tone: 'loss' },
        '. Ora: ',
        ...current,
        '.',
      ],
      tip:
        stats.longestLoseStreak >= 4
          ? [`Hai già avuto ${stats.longestLoseStreak} loss di fila: stabilire in anticipo uno stop giornaliero o una pausa dopo 3 loss può proteggerti.`]
          : undefined,
    });
  }

  // Risk
  const maxDrawdown = calculateMaxDrawdown(trades);

  if (maxDrawdown !== null) {
    const drawdown = Math.abs(maxDrawdown);

    insights.push({
      id: 'drawdown',
      topic: 'rischio',
      segments: [
        'Il drawdown massimo è ',
        drawdown === 0 ? strong('0,00 USD') : { text: `${number(drawdown)} USD`, tone: 'loss' as const },
        drawdown === 0
          ? ': finora non hai mai ceduto terreno dal massimo.'
          : totalPnl > 0
            ? ` (il ${number((drawdown / totalPnl) * 100, 0)}% del profitto netto).`
            : '.',
      ],
      tip:
        drawdown > 0 && totalPnl > 0 && drawdown / totalPnl > 0.5
          ? ['Il drawdown è grande rispetto ai guadagni: controlla la dimensione delle posizioni e il rischio per trade.']
          : undefined,
    });
  }

  if (stats.avgWin > 0 && stats.avgLoss > 0) {
    const ratio = stats.avgWin / stats.avgLoss;
    const breakEvenWinRate = (1 / (1 + ratio)) * 100;

    insights.push({
      id: 'average',
      topic: 'rischio',
      segments: [
        'In media vinci ',
        { text: `${number(stats.avgWin)} USD`, tone: 'profit' },
        ' e perdi ',
        { text: `${number(stats.avgLoss)} USD`, tone: 'loss' },
        ' per trade: rapporto ',
        strong(`${number(ratio)} a 1`),
        '.',
      ],
      tip:
        trades.length >= MIN_TRADES_FOR_TIPS
          ? [
              `Con questo rapporto vai in pari con un win rate del ${number(breakEvenWinRate, 0)}%; il tuo è ${number(stats.winRate, 0)}%.`,
            ]
          : undefined,
    });
  } else if (stats.avgWin > 0 && stats.avgLoss === 0) {
    insights.push({
      id: 'average',
      topic: 'rischio',
      segments: [
        'Non hai ancora registrato perdite: vinci in media ',
        { text: `${number(stats.avgWin)} USD`, tone: 'profit' },
        ' per trade.',
      ],
    });
  }

  if (stats.bestDayPercentOfGross > 0) {
    insights.push({
      id: 'concentration',
      topic: 'rischio',
      segments: [
        'Il tuo giorno migliore pesa il ',
        strong(`${number(stats.bestDayPercentOfGross, 0)}%`),
        ' dei profitti lordi.',
      ],
      tip:
        stats.bestDayPercentOfGross >= 50 && stats.tradingDays >= 3
          ? ['I risultati dipendono molto da pochi giorni: lavora sulla costanza (molte prop firm hanno regole di consistenza simili).']
          : undefined,
    });
  }

  // Direction
  const longs = trades.filter(trade => trade.direction === 'long');
  const shorts = trades.filter(trade => trade.direction === 'short');

  if (longs.length > 0 && shorts.length > 0) {
    const longPnl = sum(longs);
    const shortPnl = sum(shorts);
    const weaker = longPnl < shortPnl ? 'long' : 'short';
    const weakerTrades = weaker === 'long' ? longs : shorts;
    const weakerPnl = Math.min(longPnl, shortPnl);

    insights.push({
      id: 'direction',
      topic: 'direzione',
      segments: [
        `Hai fatto ${plural(longs.length, 'long', 'long')} (`,
        moneyTone(longPnl),
        `) e ${plural(shorts.length, 'short', 'short')} (`,
        moneyTone(shortPnl),
        ').',
      ],
      tip:
        weakerTrades.length >= MIN_TRADES_FOR_TIPS && weakerPnl < 0
          ? [`I ${weaker} stanno pesando sul risultato: rivedi come li stai scegliendo.`]
          : undefined,
      trades: weakerTrades,
      openTitle: `Trade ${weaker}`,
    });
  }

  return insights;
}

export { isAutomaticWindowName };
