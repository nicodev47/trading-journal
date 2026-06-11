import type { Trade, Statistics, DayData } from './types/trade';

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
  const totalPnl = dayTrades.reduce((sum, t) => sum + t.pnl - t.commission, 0);
  const totalPips = dayTrades.reduce((sum, t) => sum + t.pips, 0);
  
  return {
    date,
    trades: dayTrades,
    totalPnl,
    totalPips,
    tradeCount: dayTrades.length,
  };
}

export function calculateStatistics(trades: Trade[]): Statistics {
  if (trades.length === 0) {
    return {
      totalPnl: 0,
      totalPips: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
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
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
  );

  // Basic counts
  const winningTrades = sortedTrades.filter(t => (t.pnl - t.commission) > 0);
  const losingTrades = sortedTrades.filter(t => (t.pnl - t.commission) < 0);
  const breakEvenTrades = sortedTrades.filter(t => (t.pnl - t.commission) === 0);

  // Calculate gross wins and losses
  const grossWins = winningTrades.reduce((sum, t) => sum + (t.pnl - t.commission), 0);
  const grossLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl - t.commission), 0));

  // Total P&L and pips
  const totalPnl = sortedTrades.reduce((sum, t) => sum + t.pnl - t.commission, 0);
  const totalPips = sortedTrades.reduce((sum, t) => sum + t.pips, 0);

  // Win rate
  const winRate = (winningTrades.length / sortedTrades.length) * 100;

  // Average win/loss
  const avgWin = winningTrades.length > 0
    ? grossWins / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? grossLosses / losingTrades.length
    : 0;
  const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Profit factor
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

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
  const greenDays = dayPnLs.filter(d => d.pnl > 0).length;
  const redDays = dayPnLs.filter(d => d.pnl < 0).length;
  const dayWinRate = tradingDays > 0 ? (greenDays / tradingDays) * 100 : 0;

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
    const netPnl = trade.pnl - trade.commission;
    if (netPnl > 0) {
      tempWinStreak++;
      tempLoseStreak = 0;
      if (tempWinStreak > longestWinStreak) {
        longestWinStreak = tempWinStreak;
      }
    } else if (netPnl < 0) {
      tempLoseStreak++;
      tempWinStreak = 0;
      if (tempLoseStreak > longestLoseStreak) {
        longestLoseStreak = tempLoseStreak;
      }
    }
  });

  // Current streak (from most recent trades)
  for (let i = sortedTrades.length - 1; i >= 0; i--) {
    const netPnl = sortedTrades[i].pnl - sortedTrades[i].commission;
    if (i === sortedTrades.length - 1) {
      streakType = netPnl > 0 ? 'winning' : netPnl < 0 ? 'losing' : 'none';
      currentStreak = netPnl !== 0 ? 1 : 0;
    } else {
      const isWin = netPnl > 0;
      const isLoss = netPnl < 0;
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
    breakEvenTrades: breakEvenTrades.length,
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

export function getEquityCurveData(trades: Trade[]): { date: string; equity: number; pnl: number }[] {
  if (trades.length === 0) return [];

  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
  );

  let runningEquity = 0;
  const data: { date: string; equity: number; pnl: number }[] = [];

  // Group by day
  const tradesByDay = groupTradesByDate(sortedTrades);
  const sortedDays = Array.from(tradesByDay.keys()).sort();

  sortedDays.forEach(date => {
    const dayTrades = tradesByDay.get(date) || [];
    const dayPnl = dayTrades.reduce((sum, t) => sum + t.pnl - t.commission, 0);
    runningEquity += dayPnl;
    data.push({
      date,
      equity: runningEquity,
      pnl: dayPnl,
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
