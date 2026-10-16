export type AccountKind = 'evaluation' | 'funded' | 'live';
export type DrawdownType = 'eod-trailing' | 'intraday-trailing' | 'static';

export interface PropRules {
  /** Evaluation profit target in USD; null when not defined (funded/live or to fill in). */
  profitTarget: number | null;
  drawdown: {
    amount: number | null;
    type: DrawdownType;
    /** The floor stops trailing once it reaches the starting balance. */
    locksAtStart: boolean;
    /** The locked floor sits this many USD above the starting balance (e.g. 100). */
    lockOffset?: number;
  };
  dailyLossLimit: { amount: number; effect: 'breach' | 'lock-day' } | null;
  /** Best day must stay at or under this share (0–1) of the total profit. */
  consistency: { maxDayShare: number; appliesTo: 'evaluation' | 'funded' | 'both' } | null;
  minTradingDays: number;
  payout: {
    /** Trader's share, e.g. 0.9. */
    split: number;
    minRequest: number;
    minWinningDays: number;
    /** A winning day closes with at least this net profit. */
    winningDayMin: number;
    /** Profit above the starting balance that must stay in the account. */
    buffer: number;
    capPerPayout: number | null;
    /** Cap for the 1st, 2nd, ... payout; the last value applies from then on. */
    capSchedule?: number[];
  };
  maxContracts: string | null;
}

export interface Payout {
  id: string;
  date: string;
  gross: number;
  note?: string;
}

export type AccountSource = { kind: 'journal'; journalId: string } | { kind: 'manual' };

export interface PropAccount {
  id: string;
  firmId: string;
  firmName: string;
  ruleSetId: string;
  ruleSetName: string;
  sizeLabel: string;
  name: string;
  kind: AccountKind;
  size: number;
  rules: PropRules;
  /** Where the starting rules came from and when they were checked. */
  templateNote: string;
  source: AccountSource;
  /** YYYY-MM-DD: results before this day are ignored. */
  startDate: string;
  /** Manual accounts: balance read from the platform on a given day. */
  balanceUpdates: { date: string; balance: number }[];
  payouts: Payout[];
  createdAt: string;
}

export interface DayResult {
  date: string;
  pnl: number;
}
