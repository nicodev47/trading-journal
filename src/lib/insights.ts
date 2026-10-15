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
  | 'panoramica'
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

  // Overview
  if (trades.length < 10) {
    insights.push({
      id: 'sample',
      topic: 'panoramica',
      segments: [
        'Per ora hai ',
        strong(`${trades.length} ${trades.length === 1 ? 'trade' : 'trade'}`),
        ' nel periodo: sono ancora pochi per dire qualcosa di solido.',
      ],
      tip: ['Leggi le osservazioni qui sotto come indizi, non come verità: diventano affidabili dopo qualche decina di operazioni.'],
    });
  }

  // Setup
  const setups = getStrategyRows(trades).filter(row => row.name !== 'Senza Setup');

  if (setups.length > 0) {
    const best = setups[0];
    const worst = setups.length > 1 ? setups[setups.length - 1] : null;

    insights.push({
      id: 'setup-best',
      topic: 'setup',
      segments: [
        'Il tuo cavallo di battaglia è ',
        strong(best.name),
        ': ',
        moneyTone(best.pnl),
        ` in ${plural(best.trades, 'trade', 'trade')}, con il ${number(best.winRate, 0)}% di operazioni vincenti.`,
      ],
      tip:
        best.trades < MIN_TRADES_FOR_TIPS
          ? [`Sono solo ${best.trades} operazioni: aspetta di averne qualcuna in più prima di trarre conclusioni.`]
          : best.pnl > 0 && setups.length > 1
            ? ['Quando ti si presentano più occasioni insieme, dai la precedenza a questo setup: è quello su cui hai più riscontri.']
            : undefined,
      trades: trades.filter(trade => trade.strategy?.trim() === best.name),
      openTitle: `Setup ${best.name}`,
    });

    if (worst && worst.name !== best.name) {
      insights.push({
        id: 'setup-worst',
        topic: 'setup',
        segments: [
          strong(worst.name),
          worst.pnl < 0 ? ' è quello che ti sta costando di più: ' : ' è quello che ti rende di meno: ',
          moneyTone(worst.pnl),
          ` in ${plural(worst.trades, 'trade', 'trade')}, con il ${number(worst.winRate, 0)}% di operazioni vincenti.`,
        ],
        tip:
          worst.trades >= MIN_TRADES_FOR_TIPS && worst.pnl < 0
            ? ['Prima di scartarlo, riguarda gli ultimi trade: spesso il problema è un’entrata troppo anticipata o un contesto sbagliato, non il setup. Per un po’ prendilo solo nelle condizioni migliori.']
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
  const when = (name: string, description: string) =>
    name === description ? [strong(name)] : [strong(name), ` (${description})`];

  if (bestWindow) {
    insights.push({
      id: 'window-best',
      topic: 'orari',
      segments: [
        'Il tuo momento migliore è ',
        ...when(bestWindow.name, bestWindow.description),
        ': ',
        moneyTone(bestWindow.pnl),
        ` in ${plural(bestWindow.tradeCount, 'trade', 'trade')}.`,
      ],
      tip:
        bestWindow.tradeCount >= MIN_TRADES_FOR_TIPS && bestWindow.pnl > 0
          ? ['È la tua fascia d’oro: se devi scegliere quando esserci davvero, scegli questa.']
          : undefined,
      trades: inWindow(bestWindow.name),
      openTitle: `Finestra ${bestWindow.name}`,
    });
  }

  if (worstWindow) {
    insights.push({
      id: 'window-worst',
      topic: 'orari',
      segments: [
        'Nella fascia ',
        ...when(worstWindow.name, worstWindow.description),
        ' fai più fatica: ',
        moneyTone(worstWindow.pnl),
        ` in ${plural(worstWindow.tradeCount, 'trade', 'trade')}.`,
      ],
      tip:
        worstWindow.tradeCount >= MIN_TRADES_FOR_TIPS && worstWindow.pnl < 0
          ? ['Se non è un momento che ti appartiene, entra con più selettività o salta del tutto quelle ore.']
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
        strong(`${outside.length} trade su ${trades.length} (${number(share, 0)}%)`),
        ' li hai fatti fuori dai tuoi orari e sono finiti a ',
        moneyTone(outsidePnl),
        '.',
      ],
      tip:
        share >= 25 && outsidePnl < 0
          ? ['Gli orari che ti sei dato servono proprio a questo: se ti accorgi di essere fuori finestra, fermati e chiediti perché stai entrando.']
          : share >= 25 && outsidePnl > 0
            ? ['Fuori finestra stai andando bene: forse vale la pena ripensare i tuoi orari invece di ignorarli.']
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
    const bestDay = WEEKDAYS[Number(best.key)];
    const worstDay = worst ? WEEKDAYS[Number(worst.key)] : null;

    insights.push({
      id: 'weekday',
      topic: 'giorni',
      segments: [
        'Il ',
        strong(bestDay),
        ' è il tuo giorno migliore (',
        moneyTone(best.pnl),
        ` in ${plural(best.items.length, 'trade', 'trade')})`,
        ...(worst && worst.key !== best.key
          ? [', mentre il ', strong(worstDay ?? ''), ' è il più difficile (', moneyTone(worst.pnl), ')']
          : []),
        '.',
      ],
      tip:
        worst && worst.key !== best.key && worst.items.length >= MIN_TRADES_FOR_TIPS && worst.pnl < 0
          ? [`Il ${worstDay} potresti viverlo con più calma: meno operazioni o rischio ridotto, finché non capisci cosa va storto.`]
          : best.items.length >= MIN_TRADES_FOR_TIPS && best.pnl > 0
            ? [`Se puoi scegliere, tieni le sessioni più importanti per il ${bestDay}: è quando rendi meglio.`]
            : undefined,
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
    const hasWorst = Boolean(worst && worst.key !== best.key);

    insights.push({
      id: 'month',
      topic: 'mesi',
      segments: [
        strong(capitalize(MONTHS[Number(best.key)])),
        ' è stato il tuo mese migliore: ',
        moneyTone(best.pnl),
        ` con il ${number(best.winRate, 0)}% di operazioni vincenti`,
        ...(hasWorst && worst
          ? [', il più complicato ', strong(MONTHS[Number(worst.key)]), ' (', moneyTone(worst.pnl), ')']
          : []),
        '.',
      ],
      tip:
        hasWorst && worst && worst.pnl < 0
          ? [`Guarda cosa è cambiato a ${MONTHS[Number(worst.key)]} (orari, setup, stato d’animo): le cause tendono a ripresentarsi.`]
          : undefined,
      trades: best.items,
      openTitle: `Trade di ${MONTHS[Number(best.key)]}`,
    });
  }

  // Streaks
  if (stats.longestWinStreak > 0 || stats.longestLoseStreak > 0) {
    const current =
      stats.streakType === 'winning'
        ? [' In questo momento sei a ', strong(`${stats.currentStreak} win`), ' di fila.']
        : stats.streakType === 'losing'
          ? [' In questo momento sei a ', strong(`${stats.currentStreak} loss`), ' di fila.']
          : [];
    const tips: string[] = [];

    if (stats.streakType === 'losing' && stats.currentStreak >= 2) {
      tips.push('Dopo due loss di fila rallenta: rivedi gli ultimi trade prima del prossimo ingresso.');
    }

    if (stats.streakType === 'winning' && stats.currentStreak >= 4) {
      tips.push('Sei in un bel momento: stai attento a non alzare il rischio per eccesso di sicurezza.');
    }

    if (stats.longestLoseStreak >= 4) {
      tips.push(`In passato hai incassato ${stats.longestLoseStreak} loss di fila: fissa in anticipo uno stop giornaliero o una pausa dopo 3 loss, così non decidi a caldo.`);
    }

    insights.push({
      id: 'streak',
      topic: 'serie',
      segments: [
        'La tua striscia più bella è di ',
        { text: `${stats.longestWinStreak} win`, tone: 'profit' },
        ' di fila, la peggiore di ',
        { text: `${stats.longestLoseStreak} loss`, tone: 'loss' },
        '.',
        ...current,
      ],
      tip: tips.length > 0 ? [tips.join(' ')] : undefined,
    });
  }

  // Risk
  const maxDrawdown = calculateMaxDrawdown(trades);

  if (maxDrawdown !== null) {
    const drawdown = Math.abs(maxDrawdown);
    const heavy = drawdown > 0 && totalPnl > 0 && drawdown / totalPnl > 0.5;

    insights.push({
      id: 'drawdown',
      topic: 'rischio',
      segments:
        drawdown === 0
          ? ['Non hai mai ceduto terreno dal tuo massimo: ', strong('nessun drawdown'), ' finora.']
          : [
              'Nel momento peggiore hai ceduto ',
              { text: `${number(drawdown)} USD`, tone: 'loss' as const },
              ' dal tuo massimo',
              totalPnl > 0 ? `, il ${number((drawdown / totalPnl) * 100, 0)}% del profitto netto.` : '.',
            ],
      tip: heavy
        ? ['Il calo massimo pesa molto rispetto ai guadagni: controlla la dimensione delle posizioni e quanto rischi per trade.']
        : drawdown === 0 && trades.length >= MIN_TRADES_FOR_TIPS
          ? ['Ottimo controllo del rischio finora: tieni le stesse regole quando aumenti l’operatività.']
          : undefined,
    });
  }

  if (stats.avgWin > 0 && stats.avgLoss > 0) {
    const ratio = stats.avgWin / stats.avgLoss;
    const breakEvenWinRate = (1 / (1 + ratio)) * 100;
    let tip: string | undefined;

    if (trades.length >= MIN_TRADES_FOR_TIPS) {
      if (ratio < 1) {
        tip = 'Le perdite pesano più dei guadagni: prova a tagliare prima i trade sbagliati o a lasciar correre di più quelli giusti.';
      } else if (stats.winRate >= breakEvenWinRate) {
        tip = `Con questo rapporto ti basta vincere il ${number(breakEvenWinRate, 0)}% delle volte per andare in pari: tu sei al ${number(stats.winRate, 0)}%, quindi hai un buon margine.`;
      } else {
        tip = `Con questo rapporto ti serve vincere almeno il ${number(breakEvenWinRate, 0)}% delle volte: tu sei al ${number(stats.winRate, 0)}%, quindi lavora su uscite e dimensione dei trade.`;
      }
    }

    insights.push({
      id: 'average',
      topic: 'rischio',
      segments: [
        'In media vinci ',
        { text: `${number(stats.avgWin)} USD`, tone: 'profit' },
        ' e perdi ',
        { text: `${number(stats.avgLoss)} USD`, tone: 'loss' },
        ': per ogni dollaro che rischi ne porti a casa circa ',
        strong(number(ratio)),
        '.',
      ],
      tip: tip ? [tip] : undefined,
    });
  } else if (stats.avgWin > 0 && stats.avgLoss === 0) {
    insights.push({
      id: 'average',
      topic: 'rischio',
      segments: [
        'Non hai ancora registrato perdite: ogni vittoria ti porta in media ',
        { text: `${number(stats.avgWin)} USD`, tone: 'profit' },
        '.',
      ],
      tip: ['Quando arriverà la prima perdita sarà il test vero: decidi ora come la gestirai, così non improvvisi.'],
    });
  }

  if (stats.bestDayPercentOfGross > 0) {
    insights.push({
      id: 'concentration',
      topic: 'rischio',
      segments: [
        'Il ',
        strong(`${number(stats.bestDayPercentOfGross, 0)}%`),
        ' dei tuoi profitti lordi arriva da un solo giorno.',
      ],
      tip:
        stats.bestDayPercentOfGross >= 50 && stats.tradingDays >= 3
          ? ['I risultati dipendono da pochi giorni: puntare sulla costanza ti rende più solido (e molte prop firm hanno regole di consistenza simili).']
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
    const dominant = Math.max(longs.length, shorts.length) / trades.length;

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
          ? [`Gli ${weaker === 'short' ? 'short' : 'long'} ti stanno pesando: prova a prenderli solo con conferme più forti.`]
          : trades.length >= MIN_TRADES_FOR_TIPS && dominant >= 0.75
            ? ['Operi quasi solo da un lato: non è un problema in sé, ma controlla di non perdere occasioni dall’altra parte.']
            : undefined,
      trades: weakerTrades,
      openTitle: `Trade ${weaker}`,
    });
  }

  return insights;
}

export { isAutomaticWindowName };
