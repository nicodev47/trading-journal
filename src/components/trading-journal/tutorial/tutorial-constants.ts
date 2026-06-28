import type { Trade } from '@/lib/types/trade';

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

export function getTutorialDemoDateKey() {
  return formatDateKey(getTutorialWeekStart());
}

export function createSimpleTutorialTrades(tutorialDate: string): Trade[] {
  const baseDate = new Date(`${tutorialDate}T12:00:00`);
  const safeBaseDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
  const weekStart = getTutorialWeekStart(safeBaseDate);
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

  return demoTrades.map((trade, index) =>
    createDemoTrade({
      ...trade,
      id: `tutorial-demo-${index + 1}`,
      dateKey: formatDateKey(addDays(weekStart, trade.dayOffset)),
    })
  );
}

export function createTutorialTrades(): Trade[] {
  return createSimpleTutorialTrades(formatDateKey(new Date()));
}

export function isValidTutorialTradeSet(trades: Trade[]) {
  if (trades.length !== TUTORIAL_DEMO_PNLS.length) return false;

  return TUTORIAL_DEMO_PNLS.every((pnl, index) => trades[index]?.pnl === pnl);
}
