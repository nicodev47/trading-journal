import type { Trade } from './types/trade';
import {
  calculateWinRate,
  getTradeOutcome,
  isValidStatTrade,
} from './calculations.ts';
import type { OperatingWindowConfig } from './preferences.ts';

export type OperatingWindowName = string;

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

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours.toString().padStart(2, '0')}:${remainingMinutes
    .toString()
    .padStart(2, '0')}`;
};

const parseClock = (value: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());

  if (!match) return null;

  const total = Number(match[1]) * 60 + Number(match[2]);

  return total >= 0 && total <= 24 * 60 && Number(match[2]) < 60 ? total : null;
};

const HOURLY_WINDOWS: OperatingWindowDefinition[] = Array.from(
  { length: 24 },
  (_, hour) => ({
    name: `${formatMinutes(hour * 60)}–${formatMinutes((hour + 1) * 60)}`,
    start: hour * 60,
    end: (hour + 1) * 60,
  })
);

export function resolveWindowDefinitions(
  windows: OperatingWindowConfig[]
): OperatingWindowDefinition[] {
  const definitions = windows.flatMap(window => {
    const start = parseClock(window.start);
    const end = parseClock(window.end);

    if (start === null || end === null || end <= start || !window.name.trim()) {
      return [];
    }

    return [{ name: window.name.trim(), start, end }];
  });

  return definitions.length > 0 ? definitions : HOURLY_WINDOWS;
}

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
  trade: Trade,
  windows: OperatingWindowConfig[]
): OperatingWindowName | null {
  const timeInMinutes = getTradeTimeInMinutes(trade);

  if (timeInMinutes === null) return null;

  return (
    resolveWindowDefinitions(windows).find(
      window =>
        timeInMinutes >= window.start && timeInMinutes < window.end
    )?.name ?? null
  );
}

export function getBestOperatingWindow(
  trades: Trade[],
  windows: OperatingWindowConfig[]
): OperatingWindowResult | null {
  const validTrades = trades.filter(isValidStatTrade);
  if (validTrades.length === 0) return null;

  const groups = resolveWindowDefinitions(windows).map(window => ({
    name: window.name,
    description: getWindowDescription(window),
    start: window.start,
    end: window.end,
    pnl: 0,
    tradeCount: 0,
    winningTrades: 0,
    losingTrades: 0,
  }));

  validTrades.forEach(trade => {
    const timeInMinutes = getTradeTimeInMinutes(trade);
    const group =
      timeInMinutes === null
        ? undefined
        : groups.find(
            window =>
              timeInMinutes >= window.start &&
              timeInMinutes < window.end
          );
    if (!group) return;

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
