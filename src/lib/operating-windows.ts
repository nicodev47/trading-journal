import type { Trade } from './types/trade';
import {
  calculateWinRate,
  getTradeOutcome,
  isValidStatTrade,
} from './calculations';

export type OperatingWindowName =
  | 'Sessione di Londra'
  | 'Inizio sessione'
  | 'Fine sessione'
  | 'Late New York / Asia';

interface OperatingWindowDefinition {
  name: OperatingWindowName;
  start: number;
  end: number;
}

export interface OperatingWindowResult {
  name: OperatingWindowName;
  description: string;
  pnl: number;
  tradeCount: number;
  winRate: number;
}

const OPERATING_WINDOWS: OperatingWindowDefinition[] = [
  {
    name: 'Sessione di Londra',
    start: 0,
    end: 15 * 60 + 30,
  },
  {
    name: 'Inizio sessione',
    start: 15 * 60 + 30,
    end: 15 * 60 + 50,
  },
  {
    name: 'Fine sessione',
    start: 15 * 60 + 50,
    end: 16 * 60 + 11,
  },
  {
    name: 'Late New York / Asia',
    start: 16 * 60 + 11,
    end: 24 * 60,
  },
];

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours.toString().padStart(2, '0')}:${remainingMinutes
    .toString()
    .padStart(2, '0')}`;
};

const getWindowDescription = (window: OperatingWindowDefinition) =>
  `${formatMinutes(window.start)}–${formatMinutes(window.end)}`;

const getTradeTimeInMinutes = (trade: Trade) => {
  const time = trade.entryDate.split('T')[1]?.slice(0, 5);

  if (!time) return null;

  const [hours, minutes] = time.split(':').map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

export function getOperatingWindowName(
  trade: Trade
): OperatingWindowName | null {
  const timeInMinutes = getTradeTimeInMinutes(trade);

  if (timeInMinutes === null) return null;

  return (
    OPERATING_WINDOWS.find(
      window =>
        timeInMinutes >= window.start && timeInMinutes < window.end
    )?.name ?? null
  );
}

export function getBestOperatingWindow(
  trades: Trade[]
): OperatingWindowResult | null {
  const validTrades = trades.filter(isValidStatTrade);
  if (validTrades.length === 0) return null;

  const groups = [
    ...OPERATING_WINDOWS.map(window => ({
      name: window.name,
      description: getWindowDescription(window),
      start: window.start,
      end: window.end,
      pnl: 0,
      tradeCount: 0,
      winningTrades: 0,
      losingTrades: 0,
    })),
  ];

  validTrades.forEach(trade => {
    const timeInMinutes = getTradeTimeInMinutes(trade);
    const configuredWindow =
      timeInMinutes === null
        ? undefined
        : groups.find(
            window =>
              timeInMinutes >= window.start &&
              timeInMinutes < window.end
          );
    if (!configuredWindow) return;

    const group = configuredWindow;
    const netPnl = trade.pnl - trade.commission;

    group.pnl += netPnl;
    group.tradeCount += 1;

    const outcome = getTradeOutcome(trade);
    if (outcome === 'win') {
      group.winningTrades += 1;
    } else if (outcome === 'loss') {
      group.losingTrades += 1;
    }
  });

  const populatedGroups = groups
    .filter(group => group.tradeCount > 0)
    .map(group => ({
      name: group.name,
      description: group.description,
      pnl: group.pnl,
      tradeCount: group.tradeCount,
      winRate: calculateWinRate(group.winningTrades, group.losingTrades),
    }));

  if (populatedGroups.length === 0) return null;

  return populatedGroups.reduce((best, current) => {
    if (current.pnl !== best.pnl) {
      return current.pnl > best.pnl ? current : best;
    }

    if (current.winRate !== best.winRate) {
      return current.winRate > best.winRate ? current : best;
    }

    return current.tradeCount > best.tradeCount ? current : best;
  });
}
