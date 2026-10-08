import type { Trade } from './types/trade';
import {
  calculateWinRate,
  getTradeOutcome,
  isValidStatTrade,
} from './calculations.ts';
import type { OperatingWindowConfig } from './preferences.ts';

export type OperatingWindowName = string;

export const OUT_OF_SESSION_NAME = 'Fuori sessione';
export const PRE_SESSION_NAME = 'Pre sessione';

export const isAutomaticWindowName = (name: string) =>
  name === OUT_OF_SESSION_NAME || name === PRE_SESSION_NAME;

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

/** Windows with a name and a valid, non-empty time range; no hourly fallback. */
export function getConfiguredWindowDefinitions(
  windows: OperatingWindowConfig[]
): OperatingWindowDefinition[] {
  return windows.flatMap(window => {
    const start = parseClock(window.start);
    const end = parseClock(window.end);

    if (start === null || end === null || end <= start || !window.name.trim()) {
      return [];
    }

    return [{ name: window.name.trim(), start, end }];
  });
}

export function resolveWindowDefinitions(
  windows: OperatingWindowConfig[]
): OperatingWindowDefinition[] {
  const definitions = getConfiguredWindowDefinitions(windows);

  return definitions.length > 0 ? definitions : HOURLY_WINDOWS;
}

const getWindowDescription = (window: OperatingWindowDefinition) =>
  `${formatMinutes(window.start)}–${formatMinutes(window.end)}`;

const getTradeTimeInMinutes = (trade: Trade) => {
  const time = trade.entryDate.split('T')[1]?.slice(0, 5);

  // The editor stores 00:00 when no time was entered, so it counts as "no time".
  if (!time || time === '00:00') return null;

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

  const definitions = resolveWindowDefinitions(windows);
  const matching = definitions.find(
    window => timeInMinutes >= window.start && timeInMinutes < window.end
  );

  if (matching) return matching.name;

  const firstStart = Math.min(...definitions.map(window => window.start));

  return timeInMinutes < firstStart ? PRE_SESSION_NAME : OUT_OF_SESSION_NAME;
}

function getWindowResults(
  trades: Trade[],
  windows: OperatingWindowConfig[]
): OperatingWindowResult[] {
  const validTrades = trades.filter(isValidStatTrade);
  if (validTrades.length === 0) return [];

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

  return populatedGroups;
}

/** Valid trades that fall before or after every configured window. */
export function countOutsideWindowTrades(
  trades: Trade[],
  windows: OperatingWindowConfig[]
): number {
  return trades.filter(isValidStatTrade).filter(trade => {
    const name = getOperatingWindowName(trade, windows);

    return name === PRE_SESSION_NAME || name === OUT_OF_SESSION_NAME;
  }).length;
}

export function getBestOperatingWindow(
  trades: Trade[],
  windows: OperatingWindowConfig[]
): OperatingWindowResult | null {
  const results = getWindowResults(trades, windows);

  if (results.length === 0) return null;

  return results.reduce((best, current) => {
    if (current.pnl !== best.pnl) {
      return current.pnl > best.pnl ? current : best;
    }

    if (current.winRate !== best.winRate) {
      return current.winRate > best.winRate ? current : best;
    }

    return current.tradeCount > best.tradeCount ? current : best;
  });
}

export function getWorstOperatingWindow(
  trades: Trade[],
  windows: OperatingWindowConfig[]
): OperatingWindowResult | null {
  const results = getWindowResults(trades, windows);

  if (results.length === 0) return null;

  return results.reduce((worst, current) => {
    if (current.pnl !== worst.pnl) {
      return current.pnl < worst.pnl ? current : worst;
    }

    if (current.winRate !== worst.winRate) {
      return current.winRate < worst.winRate ? current : worst;
    }

    return current.tradeCount > worst.tradeCount ? current : worst;
  });
}
