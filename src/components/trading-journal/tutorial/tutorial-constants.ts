import type { Trade } from '@/lib/types/trade';
import type { JournalPreferences } from '../../../lib/preferences.ts';
import { getConfiguredWindowDefinitions } from '../../../lib/operating-windows.ts';
import { isUsBankHoliday } from '../../../lib/bank-holidays.ts';

export const TUTORIAL_SEEN_KEY = 'eclipsejournal-simple-tutorial-seen';
export const TUTORIAL_DEMO_PNLS = [520, 575, -450, 600, 540] as const;

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getTutorialWeekStart = (baseDate = new Date()) => {
  const date = new Date(baseDate);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + mondayOffset);
  date.setHours(12, 0, 0, 0);

  return date;
};

const addDays = (baseDate: Date, days: number) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);

  return date;
};

const createDemoTrade = ({
  id,
  dateKey,
  time,
  pnl,
  pair,
  direction,
  strategy,
  notes,
  chartUrl,
}: {
  id: string;
  dateKey: string;
  time: string;
  pnl: number;
  pair: string;
  direction: Trade['direction'];
  strategy: string;
  notes: string;
  chartUrl: string;
}): Trade => ({
  id,
  pair,
  direction,
  entryPrice: 0,
  exitPrice: 0,
  lotSize: 1,
  stopLoss: 0,
  takeProfit: 0,
  entryDate: `${dateKey}T${time}:00`,
  exitDate: `${dateKey}T${time}:00`,
  pips: pnl,
  pnl,
  commission: 0,
  riskReward: 0,
  screenshots: [{ url: chartUrl, name: 'Grafico demo' }],
  tags: pnl > 0 ? ['A+ Setup'] : ['🥶 Entrata in Ritardo'],
  isFavorite: false,
  strategy,
  notes,
  emotionalState: 'disciplined',
  setupRating: pnl > 0 ? 4 : 2,
  createdAt: `${dateKey}T${time}:00`,
  updatedAt: `${dateKey}T${time}:00`,
});

/**
 * The days of the demo trades: the working days of the current week without bank holidays
 * (the tutorial says to avoid trading them), so a week with a holiday has fewer demo trades.
 */
export function getTutorialDemoDays(baseDate = new Date()): string[] {
  const weekStart = getTutorialWeekStart(baseDate);
  const days: string[] = [];

  for (let offset = 0; offset < 5; offset += 1) {
    const key = formatDateKey(addDays(weekStart, offset));

    if (!isUsBankHoliday(key)) days.push(key);
  }

  return days;
}

export function getTutorialDemoDateKey() {
  return getTutorialDemoDays()[0];
}

const toClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * Demo trades follow the user's choices: assets and setups are cycled, and the
 * times fall inside their first operating window (when one is configured).
 */
export function personalizeDemoTrades<
  T extends { time: string; pair: string; strategy: string },
>(demoTrades: T[], preferences?: Pick<JournalPreferences, 'assets' | 'setups' | 'windows'>): T[] {
  if (!preferences) return demoTrades;

  const [window] = getConfiguredWindowDefinitions(preferences.windows);
  const offsets = [5, 15, 25, 10, 20];

  return demoTrades.map((trade, index) => ({
    ...trade,
    pair: preferences.assets.length
      ? preferences.assets[index % preferences.assets.length]
      : trade.pair,
    strategy: preferences.setups.length
      ? preferences.setups[index % preferences.setups.length]
      : trade.strategy,
    time:
      window && window.end - window.start > 1
        ? toClock(Math.min(window.start + offsets[index % offsets.length], window.end - 1))
        : trade.time,
  }));
}

export function createSimpleTutorialTrades(
  tutorialDate: string,
  preferences?: Pick<JournalPreferences, 'assets' | 'setups' | 'windows'>
): Trade[] {
  const baseDate = new Date(`${tutorialDate}T12:00:00`);
  const safeBaseDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
  const demoDays = getTutorialDemoDays(safeBaseDate);
  const demoTrades = [
    {
      dayOffset: 0,
      time: '15:35',
      pnl: 520,
      pair: 'NQ',
      direction: 'long' as const,
      strategy: 'Continuation',
      notes: 'Trade demo: ingresso in trend dopo conferma e gestione pulita.',
      chartUrl: 'https://www.tradingview.com/x/demo520/',
    },
    {
      dayOffset: 1,
      time: '10:20',
      pnl: 575,
      pair: 'MNQ',
      direction: 'short' as const,
      strategy: 'Reversal Sequence',
      notes: 'Trade demo: reversal confermato con uscita a target.',
      chartUrl: 'https://www.tradingview.com/x/demo575/',
    },
    {
      dayOffset: 2,
      time: '16:05',
      pnl: -450,
      pair: 'NQ',
      direction: 'long' as const,
      strategy: 'Reversal Sequence Failed',
      notes: 'Trade demo: setup non confermato, perdita controllata.',
      chartUrl: 'https://www.tradingview.com/x/demo450/',
    },
    {
      dayOffset: 3,
      time: '15:35',
      pnl: 600,
      pair: 'MNQ',
      direction: 'long' as const,
      strategy: 'Continuation',
      notes: 'Trade demo: continuation rispettata e take profit raggiunto.',
      chartUrl: 'https://www.tradingview.com/x/demo600/',
    },
    {
      dayOffset: 4,
      time: '11:05',
      pnl: 540,
      pair: 'NQ',
      direction: 'short' as const,
      strategy: 'Reversal Sequence',
      notes: 'Trade demo: uscita ordinata dopo reazione sul livello.',
      chartUrl: 'https://www.tradingview.com/x/demo540/',
    },
  ];

  return personalizeDemoTrades(demoTrades.slice(0, demoDays.length), preferences).map((trade, index) =>
    createDemoTrade({
      ...trade,
      id: `tutorial-demo-${index + 1}`,
      dateKey: demoDays[index],
    })
  );
}

export function createTutorialTrades(
  preferences?: Pick<JournalPreferences, 'assets' | 'setups' | 'windows'>
): Trade[] {
  return createSimpleTutorialTrades(formatDateKey(new Date()), preferences);
}

export function isValidTutorialTradeSet(trades: Trade[]) {
  // A week with a bank holiday has fewer demo trades: the first ones of the list.
  if (trades.length < 1 || trades.length > TUTORIAL_DEMO_PNLS.length) return false;

  return trades.every((trade, index) => trade.pnl === TUTORIAL_DEMO_PNLS[index]);
}
