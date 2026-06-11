export interface ScreenshotData {
  url: string;
  name: string;
}

export interface Trade {
  id: string;
  pair: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  stopLoss: number; // in pips
  takeProfit: number; // in pips
  entryDate: string; // ISO date
  exitDate: string;
  pips: number; // calculated
  pnl: number; // in USD
  commission: number;
  riskReward: number; // calculated
  screenshots: (string | ScreenshotData)[]; // base64, URLs, or ScreenshotData objects
  tags: string[];
  strategy: string;
  notes: string;
  emotionalState: 'confident' | 'nervous' | 'neutral' | 'fomo' | 'revenge' | 'disciplined';
  setupRating: number; // 1-5
  createdAt: string;
  updatedAt: string;
}

export interface DayData {
  date: string;
  trades: Trade[];
  totalPnl: number;
  totalPips: number;
  tradeCount: number;
}

export interface WeekData {
  weekStart: string;
  weekEnd: string;
  days: DayData[];
  totalPnl: number;
  totalPips: number;
  tradeCount: number;
}

export interface WeeklyPlan {
  weekKey: string;
  approach: 'intraday' | 'swing' | '';
  calendarScreenshots: string[];
  notes: string;
}

export interface JournalState {
  trades: Trade[];
  tags: string[];
  strategies: string[];
  weeklyPlans: WeeklyPlan[];
  settings: {
    currency: string;
    defaultLotSize: number;
  };
}

export interface Statistics {
  totalPnl: number;
  totalPips: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  dayWinRate: number;
  avgWin: number;
  avgLoss: number;
  avgWinLossRatio: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  bestDay: number;
  worstDay: number;
  bestDayPercentOfGross: number;
  avgRiskReward: number;
  currentStreak: number;
  streakType: 'winning' | 'losing' | 'none';
  tradingDays: number;
  greenDays: number;
  redDays: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  avgTradesPerDay: number;
  grossWins: number;
  grossLosses: number;
}

// Journal symbols
export const FOREX_PAIRS = ['MNQ', 'NQ'] as const;

export const EMOTIONAL_STATES = [
  { value: 'confident', label: 'Confident' },
  { value: 'nervous', label: 'Nervous' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'fomo', label: 'FOMO' },
  { value: 'revenge', label: 'Revenge Trading' },
  { value: 'disciplined', label: 'Disciplined' },
] as const;

export const DEFAULT_STRATEGIES: string[] = [];

export const DEFAULT_TAGS = [
  'A+ Setup',
  'B Setup',
  'C Setup',
  'London Session',
  'New York Session',
  'Asian Session',
  'High Impact News',
  'Reversal',
  'Continuation',
  'Counter-Trend',
] as const;
