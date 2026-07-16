import type { Trade, Statistics, DayData } from './types/trade';

export type PnlOutcome = 'win' | 'loss' | 'missed';

export const PNL_ZERO_TOLERANCE = 0.000001;

/**
 * Normalizes floating-point residue without changing the value saved by the
 * user or rounding legitimate decimal P&L values.
 */
export function normalizePnl(value: number): number {
  if (!Number.isFinite(value)) return value;

  return Math.abs(value) < PNL_ZERO_TOLERANCE || Object.is(value, -0)
    ? 0
    : value;
}

export function classifyPnl(value: number): PnlOutcome {
  const normalized = normalizePnl(value);

  if (normalized > 0) return 'win';
  if (normalized < 0) return 'loss';
  return 'missed';
}

export function getTradeOutcome(trade: Trade): PnlOutcome {
  return classifyPnl(trade.pnl);
}

export function isMissedTrade(trade: Trade): boolean {
  return getTradeOutcome(trade) === 'missed';
}

export function isValidStatTrade(trade: Trade): boolean {
  return !isMissedTrade(trade);
}

export function isWinningTrade(trade: Trade): boolean {
  return getTradeOutcome(trade) === 'win';
}

export function isLosingTrade(trade: Trade): boolean {
  return getTradeOutcome(trade) === 'loss';
}

export function calculateWinRate(wins: number, losses: number): number {
  const decisiveTrades = wins + losses;
  return decisiveTrades > 0 ? (wins / decisiveTrades) * 100 : 0;
}

export function calculateTradeWinRate(trades: Trade[]): number {
  let wins = 0;
  let losses = 0;

  trades.forEach((trade) => {
    const outcome = getTradeOutcome(trade);
    if (outcome === 'win') wins += 1;
    if (outcome === 'loss') losses += 1;
  });

  return calculateWinRate(wins, losses);
}

export interface RiskRewardRatioResult {
  value: number | null;
  avgWin: number;
  avgLoss: number;
}

/** Average winning trade divided by the absolute average losing trade. */
export function calculateRiskRewardRatio(
  trades: Trade[]
): RiskRewardRatioResult {
  const validTrades = trades.filter(isValidStatTrade);
  const winningTrades = validTrades.filter(isWinningTrade);
  const losingTrades = validTrades.filter(isLosingTrade);

  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce(
          (sum, trade) => sum + normalizePnl(trade.pnl - trade.commission),
          0
        ) / winningTrades.length
      : 0;
  const avgLoss =
    losingTrades.length > 0
      ? Math.abs(
          losingTrades.reduce(
            (sum, trade) => sum + normalizePnl(trade.pnl - trade.commission),
            0
          ) / losingTrades.length
        )
      : 0;

  return {
    value:
      avgWin > 0 && avgLoss > 0 ? normalizePnl(avgWin / avgLoss) : null,
    avgWin: normalizePnl(avgWin),
    avgLoss: normalizePnl(avgLoss),
  };
}

export function formatRiskRewardRatio(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '-';

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: false,
  });
}

export type ProfitFactorState =
  | 'empty'
  | 'infinite'
  | 'positive'
  | 'neutral'
  | 'negative';

export interface ProfitFactorResult {
  value: number | null;
  grossProfit: number;
  grossLoss: number;
  state: ProfitFactorState;
}

/** Shared Profit Factor result for every statistics surface. */
export function calculateProfitFactorDetails(trades: Trade[]): ProfitFactorResult {
  const validTrades = trades.filter(isValidStatTrade);

  if (validTrades.length === 0) {
    return { value: null, grossProfit: 0, grossLoss: 0, state: 'empty' };
  }

  let grossProfit = 0;
  let grossLoss = 0;

  validTrades.forEach((trade) => {
    const pnl = normalizePnl(trade.pnl);

    if (pnl > 0) grossProfit += pnl;
    if (pnl < 0) grossLoss += Math.abs(pnl);
  });

  if (grossLoss === 0) {
    return {
      value: Infinity,
      grossProfit: normalizePnl(grossProfit),
      grossLoss: 0,
      state: 'infinite',
    };
  }

  const value = normalizePnl(grossProfit / grossLoss);

  return {
    value,
    grossProfit: normalizePnl(grossProfit),
    grossLoss: normalizePnl(grossLoss),
    state: value > 1 ? 'positive' : value === 1 ? 'neutral' : 'negative',
  };
}

/**
 * Gross profit divided by the absolute gross loss for statistical trades.
 * `null` means that there are no trades with a non-zero P&L; `Infinity`
 * represents profits without any losses.
 */
export function calculateProfitFactor(trades: Trade[]): number | null {
  return calculateProfitFactorDetails(trades).value;
}

export function formatProfitFactorValue(result: ProfitFactorResult): string {
  if (result.state === 'empty') return '—';
  if (result.state === 'infinite') return '∞';

  return (result.value ?? 0).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });
}

export function formatProfitFactorSubtitle(result: ProfitFactorResult): string {
  if (result.state === 'empty') return 'Nessun dato disponibile';
  if (result.state === 'infinite') return 'Nessuna loss registrata';
  if (result.grossProfit === 0 && result.grossLoss > 0) {
    return 'Nessun profitto registrato';
  }

  return 'Rapporto profitti / perdite';
}

const formatProfitFactorCurrency = (value: number) =>
  `${value.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  })} USD`;

export function formatProfitFactorBreakdown(
  result: ProfitFactorResult,
  maskValues = false
): string {
  if (result.state === 'empty') return 'Nessun dato disponibile';
  if (maskValues) return '****** USD profit · ****** USD loss';

  return `${formatProfitFactorCurrency(result.grossProfit)} profit · ${formatProfitFactorCurrency(result.grossLoss)} loss`;
}

/** Average P&L for each statistical trade (trades at zero are excluded). */
export function calculateExpectancy(trades: Trade[]): number | null {
  const validTrades = trades.filter(isValidStatTrade);

  if (validTrades.length === 0) return null;

  const totalPnl = validTrades.reduce(
    (sum, trade) => sum + normalizePnl(trade.pnl),
    0
  );

  return normalizePnl(totalPnl / validTrades.length);
}

function getChronologicalTradeTimestamp(trade: Trade): number | null {
  const rawDates = [trade.exitDate, trade.entryDate];

  for (const rawDate of rawDates) {
    if (typeof rawDate !== 'string' || rawDate.trim() === '') continue;

    const timestamp = Date.parse(rawDate);
    if (Number.isFinite(timestamp)) return timestamp;

    // Preserve the date ordering even when an imported time is malformed.
    const dateOnly = rawDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (!dateOnly) continue;

    const dateTimestamp = Date.parse(`${dateOnly}T00:00:00`);
    if (Number.isFinite(dateTimestamp)) return dateTimestamp;
  }

  return null;
}

/**
 * Worst equity decline from a previous peak. The result is always negative or
 * zero; `null` means that no statistical trade is available.
 */
export function calculateMaxDrawdown(trades: Trade[]): number | null {
  const validTrades = trades
    .filter(isValidStatTrade)
    .map((trade, originalIndex) => ({
      trade,
      originalIndex,
      timestamp: getChronologicalTradeTimestamp(trade),
    }))
    .sort((a, b) => {
      if (a.timestamp === null && b.timestamp === null) {
        return a.originalIndex - b.originalIndex;
      }
      if (a.timestamp === null) return 1;
      if (b.timestamp === null) return -1;

      return a.timestamp - b.timestamp || a.originalIndex - b.originalIndex;
    });

  if (validTrades.length === 0) return null;

  let currentEquity = 0;
  let equityPeak = 0;
  let maxDrawdown = 0;

  validTrades.forEach(({ trade }) => {
    currentEquity += normalizePnl(trade.pnl);
    equityPeak = Math.max(equityPeak, currentEquity);
    maxDrawdown = Math.min(maxDrawdown, currentEquity - equityPeak);
  });

  return normalizePnl(maxDrawdown);
}

export interface OperationalFrequency {
  score: number;
  weeksWithMinimumTrades: number;
  totalWeeks: number;
}

export const MIN_TRADES_PER_WEEK = 3;

function getStatTradeDate(trade: Trade): Date | null {
  const rawDate = trade.exitDate || trade.entryDate;
  const date = new Date(rawDate);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getCalendarWeekStart(date: Date, weekStartsOn: 0 | 1): Date {
  const weekStart = new Date(date);
  const daysSinceWeekStart = (weekStart.getDay() - weekStartsOn + 7) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceWeekStart);
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Percentage of calendar weeks reaching the minimum number of statistical
 * trades. Empty weeks between the first and last valid trade are included.
 */
export function calculateOperationalFrequency(
  trades: Trade[],
  weekStartsOn: 0 | 1,
  minimumTrades = MIN_TRADES_PER_WEEK
): OperationalFrequency {
  const validTradeDates = trades
    .filter(isValidStatTrade)
    .map(getStatTradeDate)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  if (validTradeDates.length === 0) {
    return { score: 0, weeksWithMinimumTrades: 0, totalWeeks: 0 };
  }

  const weekTradeCounts = new Map<string, number>();

  validTradeDates.forEach((date) => {
    const weekKey = getLocalDateKey(getCalendarWeekStart(date, weekStartsOn));
    weekTradeCounts.set(weekKey, (weekTradeCounts.get(weekKey) ?? 0) + 1);
  });

  const firstWeekStart = getCalendarWeekStart(validTradeDates[0], weekStartsOn);
  const lastWeekStart = getCalendarWeekStart(
    validTradeDates[validTradeDates.length - 1],
    weekStartsOn
  );
  const cursor = new Date(firstWeekStart);
  let totalWeeks = 0;
  let weeksWithMinimumTrades = 0;

  while (cursor <= lastWeekStart) {
    totalWeeks += 1;

    if ((weekTradeCounts.get(getLocalDateKey(cursor)) ?? 0) >= minimumTrades) {
      weeksWithMinimumTrades += 1;
    }

    cursor.setDate(cursor.getDate() + 7);
  }

  const score = totalWeeks > 0
    ? Math.min(Math.max((weeksWithMinimumTrades / totalWeeks) * 100, 0), 100)
    : 0;

  return { score, weeksWithMinimumTrades, totalWeeks };
}

export function calculateEclipseScore(scores: readonly number[]): number {
  if (scores.length === 0) return 0;

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Number(Math.min(Math.max(average, 0), 100).toFixed(1));
}

export function filterCalendarTrades(
  trades: Trade[],
  showZeroPnlTradesInCalendar: boolean
): Trade[] {
  return showZeroPnlTradesInCalendar
    ? trades
    : trades.filter(isValidStatTrade);
}

// Standard pip value for 1 standard lot (100,000 units)
const STANDARD_LOT_PIP_VALUE: Record<string, number> = {
  // Major pairs (pip value in USD for 1 standard lot)
  'EUR/USD': 10,
  'GBP/USD': 10,
  'AUD/USD': 10,
  'NZD/USD': 10,
  'USD/JPY': 9.1, // Approximate, varies with USD/JPY rate
  'USD/CHF': 10.6, // Approximate
  'USD/CAD': 7.5, // Approximate
  // Crosses (approximate values)
  'EUR/GBP': 12.5,
  'EUR/JPY': 9.1,
  'GBP/JPY': 9.1,
  'EUR/CHF': 10.6,
  'EUR/AUD': 6.5,
  'EUR/CAD': 7.5,
  'EUR/NZD': 6.0,
  'GBP/CHF': 10.6,
  'GBP/AUD': 6.5,
  'GBP/CAD': 7.5,
  'GBP/NZD': 6.0,
  'AUD/JPY': 9.1,
  'AUD/CHF': 10.6,
  'AUD/CAD': 7.5,
  'AUD/NZD': 6.0,
  'CAD/JPY': 9.1,
  'CAD/CHF': 10.6,
  'CHF/JPY': 9.1,
  'NZD/JPY': 9.1,
  'NZD/CHF': 10.6,
  'NZD/CAD': 7.5,
  // Metals
  'XAU/USD': 10,
  'XAG/USD': 50,
};

export function isJPYPair(pair: string): boolean {
  return pair.includes('JPY');
}

export function getPipMultiplier(pair: string): number {
  return isJPYPair(pair) ? 100 : 10000;
}

export function calculatePips(
  pair: string,
  entryPrice: number,
  exitPrice: number,
  direction: 'long' | 'short'
): number {
  const multiplier = getPipMultiplier(pair);
  const rawPips = (exitPrice - entryPrice) * multiplier;
  return direction === 'long' ? rawPips : -rawPips;
}

export function calculatePnL(
  pair: string,
  pips: number,
  lotSize: number
): number {
  const pipValue = STANDARD_LOT_PIP_VALUE[pair] || 10;
  return pips * pipValue * lotSize;
}

export function calculateRiskReward(
  pips: number,
  stopLoss: number
): number {
  if (stopLoss === 0) return 0;
  return Math.abs(pips / stopLoss);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function groupTradesByDate(trades: Trade[]): Map<string, Trade[]> {
  const grouped = new Map<string, Trade[]>();
  
  trades.forEach(trade => {
    const dateKey = trade.exitDate.split('T')[0];
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, trade]);
  });
  
  return grouped;
}

export function getDayData(trades: Trade[], date: string): DayData {
  const dayTrades = trades.filter(t => t.exitDate.startsWith(date));
  const validTrades = dayTrades.filter(isValidStatTrade);
  const totalPnl = validTrades.reduce((sum, t) => sum + t.pnl - t.commission, 0);
  const totalPips = validTrades.reduce((sum, t) => sum + t.pips, 0);
  
  return {
    date,
    trades: dayTrades,
    totalPnl,
    totalPips,
    tradeCount: dayTrades.length,
    validTradeCount: validTrades.length,
  };
}

export function calculateStatistics(trades: Trade[]): Statistics {
  const missedTrades = trades.filter(isMissedTrade);
  const validTrades = trades.filter(isValidStatTrade);

  if (validTrades.length === 0) {
    return {
      totalPnl: 0,
      totalPips: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: missedTrades.length,
      winRate: 0,
      dayWinRate: 0,
      avgWin: 0,
      avgLoss: 0,
      avgWinLossRatio: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      bestDay: 0,
      worstDay: 0,
      bestDayPercentOfGross: 0,
      avgRiskReward: 0,
      currentStreak: 0,
      streakType: 'none',
      tradingDays: 0,
      greenDays: 0,
      redDays: 0,
      longestWinStreak: 0,
      longestLoseStreak: 0,
      avgTradesPerDay: 0,
      grossWins: 0,
      grossLosses: 0,
    };
  }

  // Sort trades by exit date
  const sortedTrades = [...validTrades].sort(
    (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
  );

  // Basic counts
  const winningTrades = sortedTrades.filter(isWinningTrade);
  const losingTrades = sortedTrades.filter(isLosingTrade);

  // Calculate gross wins and losses
  const grossWins = winningTrades.reduce((sum, t) => sum + (t.pnl - t.commission), 0);
  const grossLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl - t.commission), 0));

  // Total P&L and pips
  const totalPnl = sortedTrades.reduce((sum, t) => sum + t.pnl - t.commission, 0);
  const totalPips = sortedTrades.reduce((sum, t) => sum + t.pips, 0);

  // Win rate
  const winRate = calculateWinRate(winningTrades.length, losingTrades.length);

  // Average win/loss
  const avgWin = winningTrades.length > 0
    ? grossWins / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? grossLosses / losingTrades.length
    : 0;
  const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Profit factor
  const profitFactor = calculateProfitFactor(sortedTrades) ?? 0;

  // Average R:R
  const avgRiskReward = sortedTrades.reduce((sum, t) => sum + t.riskReward, 0) / sortedTrades.length;

  // Group by day for day-based statistics
  const tradesByDay = groupTradesByDate(sortedTrades);
  const dayPnLs: { date: string; pnl: number }[] = [];
  
  tradesByDay.forEach((dayTrades, date) => {
    const dayPnl = dayTrades.reduce((sum, t) => sum + t.pnl - t.commission, 0);
    dayPnLs.push({ date, pnl: dayPnl });
  });

  const tradingDays = dayPnLs.length;
  const greenDays = dayPnLs.filter(d => classifyPnl(d.pnl) === 'win').length;
  const redDays = dayPnLs.filter(d => classifyPnl(d.pnl) === 'loss').length;
  const dayWinRate = calculateWinRate(greenDays, redDays);

  const bestDay = dayPnLs.length > 0 ? Math.max(...dayPnLs.map(d => d.pnl)) : 0;
  const worstDay = dayPnLs.length > 0 ? Math.min(...dayPnLs.map(d => d.pnl)) : 0;
  const bestDayPercentOfGross = grossWins > 0 ? (bestDay / grossWins) * 100 : 0;

  // Calculate max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let runningPnl = 0;

  sortedTrades.forEach(trade => {
    runningPnl += trade.pnl - trade.commission;
    if (runningPnl > peak) {
      peak = runningPnl;
    }
    const drawdown = peak - runningPnl;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

  // Calculate streaks
  let currentStreak = 0;
  let streakType: 'winning' | 'losing' | 'none' = 'none';
  let longestWinStreak = 0;
  let longestLoseStreak = 0;
  let tempWinStreak = 0;
  let tempLoseStreak = 0;

  sortedTrades.forEach(trade => {
    const outcome = getTradeOutcome(trade);
    if (outcome === 'win') {
      tempWinStreak++;
      tempLoseStreak = 0;
      if (tempWinStreak > longestWinStreak) {
        longestWinStreak = tempWinStreak;
      }
    } else if (outcome === 'loss') {
      tempLoseStreak++;
      tempWinStreak = 0;
      if (tempLoseStreak > longestLoseStreak) {
        longestLoseStreak = tempLoseStreak;
      }
    }
  });

  // Current streak (from most recent trades)
  for (let i = sortedTrades.length - 1; i >= 0; i--) {
    const outcome = getTradeOutcome(sortedTrades[i]);
    if (i === sortedTrades.length - 1) {
      streakType = outcome === 'win' ? 'winning' : outcome === 'loss' ? 'losing' : 'none';
      currentStreak = outcome !== 'missed' ? 1 : 0;
    } else {
      const isWin = outcome === 'win';
      const isLoss = outcome === 'loss';
      if ((streakType === 'winning' && isWin) || (streakType === 'losing' && isLoss)) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  const avgTradesPerDay = tradingDays > 0 ? sortedTrades.length / tradingDays : 0;

  return {
    totalPnl,
    totalPips,
    totalTrades: sortedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakEvenTrades: missedTrades.length,
    winRate,
    dayWinRate,
    avgWin,
    avgLoss,
    avgWinLossRatio,
    profitFactor,
    maxDrawdown,
    maxDrawdownPercent,
    bestDay,
    worstDay,
    bestDayPercentOfGross,
    avgRiskReward,
    currentStreak,
    streakType,
    tradingDays,
    greenDays,
    redDays,
    longestWinStreak,
    longestLoseStreak,
    avgTradesPerDay,
    grossWins,
    grossLosses,
  };
}

export function getEquityCurveData(
  trades: Trade[]
): {
  date: string;
  displayDate?: string;
  equity: number;
  pnl: number;
  tradeIds?: string[];
  isStart?: boolean;
}[] {
  const validTrades = trades.filter(isValidStatTrade);
  if (validTrades.length === 0) return [];

  const sortedTrades = [...validTrades].sort(
    (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
  );

  let runningEquity = 0;
  const data: {
    date: string;
    displayDate?: string;
    equity: number;
    pnl: number;
    tradeIds?: string[];
    isStart?: boolean;
  }[] = [];

  // Group by day
  const tradesByDay = groupTradesByDate(sortedTrades);
  const sortedDays = Array.from(tradesByDay.keys()).sort();

  if (sortedDays.length > 0) {
    data.push({
      date: `${sortedDays[0]}-start`,
      displayDate: 'Start',
      equity: 0,
      pnl: 0,
      isStart: true,
    });
  }

  sortedDays.forEach(date => {
    const dayTrades = tradesByDay.get(date) || [];
    const dayPnl = dayTrades.reduce((sum, t) => sum + t.pnl - t.commission, 0);
    runningEquity += dayPnl;
    data.push({
      date,
      equity: runningEquity,
      pnl: dayPnl,
      tradeIds: dayTrades.map((trade) => trade.id),
    });
  });

  return data;
}

export function filterTradesByDateRange(
  trades: Trade[],
  startDate: string,
  endDate: string
): Trade[] {
  return trades.filter(trade => {
    const tradeDate = trade.exitDate.split('T')[0];
    return tradeDate >= startDate && tradeDate <= endDate;
  });
}

export function filterTradesByPair(trades: Trade[], pair: string): Trade[] {
  return trades.filter(trade => trade.pair === pair);
}

export function filterTradesByStrategy(trades: Trade[], strategy: string): Trade[] {
  return trades.filter(trade => trade.strategy === strategy);
}

export function filterTradesByTags(trades: Trade[], tags: string[]): Trade[] {
  if (tags.length === 0) return trades;
  return trades.filter(trade => tags.some(tag => trade.tags.includes(tag)));
}

export function filterTradesByDirection(trades: Trade[], direction: 'long' | 'short'): Trade[] {
  return trades.filter(trade => trade.direction === direction);
}
