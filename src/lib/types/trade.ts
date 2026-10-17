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
  isFavorite: boolean;
  strategy: string;
  notes: string;
  /** Emotions felt during the trade (values of TRADE_EMOTIONS). */
  emotions?: string[];
  emotionalState: 'confident' | 'nervous' | 'neutral' | 'fomo' | 'revenge' | 'disciplined';
  setupRating: number; // 1-5
  createdAt: string;
  updatedAt: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  notes: string;
  /** Optional link to an executed trade of the same day. */
  tradeId?: string;
  screenshots: ScreenshotData[];
}

/** One entry of the Progress Tracker: the thinking behind a day, not its executions. */
export interface DailyAnalysis {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  analysis: string;
  observations: string;
  /** Legacy: no longer edited, kept so old backups still load. */
  caseStudies: CaseStudy[];
  /** Files and links of the day (charts, screenshots). */
  attachments?: ScreenshotData[];
  createdAt: string;
  updatedAt: string;
}

export interface MissedTrade {
  id: string;
  date: string;
  potentialPnl: number;
  asset: string;
  direction: 'long' | 'short' | '';
  time: string;
  setup: string;
  reason: string;
  screenshots: ScreenshotData[];
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DayData {
  date: string;
  trades: Trade[];
  totalPnl: number;
  totalPips: number;
  tradeCount: number;
  validTradeCount: number;
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
  missedTrades: MissedTrade[];
  tags: string[];
  tagsInitialized?: boolean;
  /** Version of the preset tags this journal already received. */
  tagPresetsVersion?: number;
  strategies: string[];
  customTags: string[];
  tagColors: Record<string, string>;
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

export const TRADE_TAGS = [
  { value: 'early_entry', emoji: '⏳', label: 'Entrata in Anticipo' },
  { value: 'late_entry', emoji: '🥶', label: 'Entrata in Ritardo' },
  { value: 'early_exit', emoji: '🚪', label: 'Uscita Anticipata' },
  { value: 'late_exit', emoji: '🐢', label: 'Uscita in Ritardo' },
  { value: 'moved_stop', emoji: '📏', label: 'Stop Spostato' },
  { value: 'oversized', emoji: '💥', label: 'Size Eccessiva' },
  { value: 'revenge_trade', emoji: '🔄', label: 'Revenge Trade' },
  { value: 'off_plan', emoji: '🚫', label: 'Fuori Piano' },
  { value: 'choppy_market', emoji: '🌀', label: 'Mercato Laterale' },
  { value: 'strong_trend', emoji: '🚀', label: 'Trend Forte' },
  { value: 'a_plus_setup', emoji: '⭐', label: 'A+ Setup' },
] as const;

/** Bump when TRADE_TAGS gets new presets: journals saved before receive them once. */
export const TAG_PRESETS_VERSION = 1;

/** Old standard tags that moved elsewhere: still readable on trades saved before. */
export const LEGACY_TRADE_TAGS = [{ value: 'fomo', emoji: '🏃', label: 'FOMO' }] as const;

export const CUSTOM_TAG_PREFIX = 'custom:';

export type TradeSetup = string;

export function isValidTradeSetup(
  value?: string | null
): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getEditableSetupValue(
  value?: string | null
): string {
  return isValidTradeSetup(value) ? value.trim() : '';
}

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
  '⏳ Entrata in Anticipo',
  '🥶 Entrata in Ritardo',
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
