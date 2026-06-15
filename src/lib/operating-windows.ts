import type { Trade } from './types/trade';

interface OperatingWindowDefinition {
  name: string;
  start: number;
  end: number;
}

export interface OperatingWindowResult {
  name: string;
  description: string;
  pnl: number;
  tradeCount: number;
  winRate: number;
}

const OPERATING_WINDOWS: OperatingWindowDefinition[] = [
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
];

const OUTSIDE_WINDOW = {
  name: 'Fuori orario',
  description: 'Trade fuori dalle finestre operative',
} as const;

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

export function getBestOperatingWindow(
  trades: Trade[]
): OperatingWindowResult | null {
  if (trades.length === 0) return null;

  const groups = [
    ...OPERATING_WINDOWS.map(window => ({
      name: window.name,
      description: getWindowDescription(window),
      start: window.start,
      end: window.end,
      pnl: 0,
      tradeCount: 0,
      winningTrades: 0,
    })),
    {
      ...OUTSIDE_WINDOW,
      start: null,
      end: null,
      pnl: 0,
      tradeCount: 0,
      winningTrades: 0,
    },
  ];

  trades.forEach(trade => {
    const timeInMinutes = getTradeTimeInMinutes(trade);
    const configuredWindow =
      timeInMinutes === null
        ? undefined
        : groups.slice(0, OPERATING_WINDOWS.length).find(
            window =>
              window.start !== null &&
              window.end !== null &&
              timeInMinutes >= window.start &&
              timeInMinutes < window.end
          );
    const group = configuredWindow ?? groups[groups.length - 1];
    const netPnl = trade.pnl - trade.commission;

    group.pnl += netPnl;
    group.tradeCount += 1;

    if (netPnl > 0) {
      group.winningTrades += 1;
    }
  });

  const populatedGroups = groups
    .filter(group => group.tradeCount > 0)
    .map(group => ({
      name: group.name,
      description: group.description,
      pnl: group.pnl,
      tradeCount: group.tradeCount,
      winRate: (group.winningTrades / group.tradeCount) * 100,
    }));

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
