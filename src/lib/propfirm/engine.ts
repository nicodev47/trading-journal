import type { AccountKind, DayResult, Payout, PropRules } from './types.ts';

export type AccountStatus = 'active' | 'passed' | 'failed';
export type FailReason = 'drawdown' | 'daily-loss';

export interface DayRow {
  date: string;
  pnl: number;
  balance: number;
  floor: number;
  /** Daily loss limit reached on a "lock the day" plan (not a breach). */
  dayLocked: boolean;
}

export interface ConsistencySummary {
  limit: number;
  /** Best day / profit, null while there is no profit. */
  share: number | null;
  ok: boolean;
  bestDay: number;
  bestDayDate: string | null;
  profitCounted: number;
  /** Largest gain tomorrow that keeps the rule satisfied, null without profit. */
  biggestNextDay: number | null;
  profitToFix: number;
}

export interface PayoutSummary {
  winningDays: number;
  available: number;
  eligible: boolean;
  /** Human-readable reasons why a payout cannot be requested yet. */
  missing: string[];
  paidGross: number;
  paidNet: number;
}

export interface AccountSim {
  status: AccountStatus;
  endedOn: string | null;
  failReason: FailReason | null;
  balance: number;
  profit: number;
  /** Profit since the last payout (all of it before the first payout). */
  cycleProfit: number;
  floor: number;
  /** How much the balance can still fall before the drawdown is breached. */
  room: number;
  tradingDays: number;
  /** Profit needed to pass: the target, raised when the best day is too big. */
  requiredProfit: number | null;
  profitToGo: number | null;
  consistency: ConsistencySummary | null;
  payout: PayoutSummary | null;
  days: DayRow[];
  /** Intraday trailing is approximated with end-of-day balances. */
  approximate: boolean;
}

export interface SimInput {
  kind: AccountKind;
  size: number;
  rules: PropRules;
  days: DayResult[];
  payouts: Payout[];
}

const round = (value: number) => Math.round(value * 100) / 100;

export function floorFor(rules: PropRules, size: number, peak: number): number {
  const amount = rules.drawdown.amount ?? 0;

  if (rules.drawdown.type === 'static') return size - amount;

  const trailing = peak - amount;

  return rules.drawdown.locksAtStart
    ? Math.min(trailing, size + (rules.drawdown.lockOffset ?? 0))
    : trailing;
}

/** Profit the evaluation needs: the target, raised if one day is too large. */
export function getRequiredProfit(
  rules: PropRules,
  bestDay: number
): number | null {
  if (rules.profitTarget === null) return null;

  const consistency =
    rules.consistency && rules.consistency.appliesTo !== 'funded' ? rules.consistency : null;

  return consistency && consistency.maxDayShare > 0
    ? Math.max(rules.profitTarget, bestDay / consistency.maxDayShare)
    : rules.profitTarget;
}

const consistencyApplies = (rules: PropRules, kind: AccountKind) => {
  if (!rules.consistency) return false;

  const { appliesTo } = rules.consistency;

  return appliesTo === 'both' || (appliesTo === 'evaluation') === (kind === 'evaluation');
};

export function simulateAccount({ kind, size: planSize, rules, days, payouts }: SimInput): AccountSim {
  // Live accounts start from $0 (or the given amount): every level is relative to it.
  const size = rules.startBalance ?? planSize;
  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const sortedPayouts = [...payouts].sort((a, b) => a.date.localeCompare(b.date));

  let balance = size;
  let peak = size;
  let status: AccountStatus = 'active';
  let endedOn: string | null = null;
  let failReason: FailReason | null = null;
  let tradingDays = 0;
  let bestDay = 0;
  let bestDayDate: string | null = null;
  let winningDays = 0;
  let cycleStart = 0;
  let payoutIndex = 0;
  // Some plans freeze the floor for good once the first payout is taken.
  let floorLocked = false;
  const currentFloor = () =>
    floorLocked ? size + (rules.drawdown.lockOffset ?? 0) : floorFor(rules, size, peak);
  const rows: DayRow[] = [];

  /** Applies the payouts up to a date (that day included unless `inclusive` is false). */
  const applyPayoutsUntil = (date: string | null, inclusive = true) => {
    while (
      payoutIndex < sortedPayouts.length &&
      (date === null ||
        (inclusive
          ? sortedPayouts[payoutIndex].date <= date
          : sortedPayouts[payoutIndex].date < date))
    ) {
      const payout = sortedPayouts[payoutIndex];

      // A withdrawal is not a loss for the rules (the peak stays), but it
      // does shrink the cushion above the floor.
      balance -= payout.gross;
      winningDays = 0;
      cycleStart = balance;
      if (rules.drawdown.lockOnPayout) floorLocked = true;
      payoutIndex += 1;
    }
  };

  for (const day of sortedDays) {
    // Payouts made on earlier days are already behind us; a payout of this very day
    // is taken at its close, after the day's result, so that day belongs to the paid cycle.
    if (kind !== 'evaluation') applyPayoutsUntil(day.date, false);

    balance += day.pnl;
    peak = Math.max(peak, balance);
    tradingDays += 1;

    if (day.pnl > bestDay) {
      bestDay = day.pnl;
      bestDayDate = day.date;
    }

    if (day.pnl > 0 && day.pnl >= rules.payout.winningDayMin) winningDays += 1;

    const floor = currentFloor();
    const limit = rules.dailyLossLimit;
    const dailyHit = Boolean(limit && day.pnl <= -limit.amount);

    rows.push({
      date: day.date,
      pnl: round(day.pnl),
      balance: round(balance),
      floor: round(floor),
      dayLocked: dailyHit && limit?.effect === 'lock-day',
    });

    if (rules.drawdown.amount !== null && balance <= floor) {
      status = 'failed';
      failReason = 'drawdown';
      endedOn = day.date;
      break;
    }

    if (dailyHit && limit?.effect === 'breach') {
      status = 'failed';
      failReason = 'daily-loss';
      endedOn = day.date;
      break;
    }

    if (kind !== 'evaluation') {
      const before = payoutIndex;

      applyPayoutsUntil(day.date);

      if (payoutIndex > before) rows[rows.length - 1].balance = round(balance);
    }

    if (kind === 'evaluation') {
      const required = getRequiredProfit(rules, bestDay);

      if (
        required !== null &&
        balance - size >= required &&
        tradingDays >= rules.minTradingDays
      ) {
        status = 'passed';
        endedOn = day.date;
        break;
      }
    }
  }

  if (kind !== 'evaluation' && status === 'active') applyPayoutsUntil(null);

  const floor = currentFloor();
  const profit = round(balance - size);
  const required = kind === 'evaluation' ? getRequiredProfit(rules, bestDay) : null;

  let consistency: ConsistencySummary | null = null;

  if (rules.consistency && consistencyApplies(rules, kind)) {
    const limit = rules.consistency.maxDayShare;
    const share = profit > 0 ? bestDay / profit : null;
    const ok = share === null || share <= limit;

    consistency = {
      limit,
      share,
      ok,
      bestDay: round(bestDay),
      bestDayDate,
      profitCounted: Math.max(0, profit),
      biggestNextDay: profit > 0 && limit < 1 ? round((limit * profit) / (1 - limit)) : null,
      profitToFix: ok || limit <= 0 ? 0 : round(bestDay / limit - profit),
    };
  }

  let payout: PayoutSummary | null = null;

  if (kind !== 'evaluation') {
    const { payout: terms } = rules;
    const profitAboveBuffer = Math.max(0, balance - size - terms.buffer);
    const raw = profitAboveBuffer * (terms.profitShare ?? 1);
    const schedule = terms.capSchedule?.length ? terms.capSchedule : null;
    const cap = schedule
      ? schedule[Math.min(sortedPayouts.length, schedule.length - 1)]
      : terms.capPerPayout;
    const available = round(cap === null ? raw : Math.min(raw, cap));
    const missing: string[] = [];

    if (winningDays < terms.minWinningDays) {
      missing.push(`Servono ${terms.minWinningDays} giorni vincenti (ne hai ${winningDays})`);
    }

    if (available < Math.max(terms.minRequest, 0.01)) {
      missing.push(
        terms.minRequest > 0
          ? `Il payout minimo è ${terms.minRequest} USD (disponibile ${available})`
          : 'Non c’è ancora profitto disponibile'
      );
    }

    if (terms.maxPayouts !== undefined && sortedPayouts.length >= terms.maxPayouts) {
      missing.push(`Hai già fatto il massimo di ${terms.maxPayouts} payout`);
    }

    if (consistency && !consistency.ok) {
      missing.push('La regola di consistenza non è rispettata');
    }

    const paidGross = sortedPayouts.reduce((sum, item) => sum + item.gross, 0);

    payout = {
      winningDays,
      available,
      eligible: missing.length === 0,
      missing,
      paidGross: round(paidGross),
      paidNet: round(paidGross * terms.split),
    };
  }

  return {
    status,
    endedOn,
    failReason,
    balance: round(balance),
    profit,
    cycleProfit: round(kind === 'evaluation' || sortedPayouts.length === 0 ? profit : balance - cycleStart),
    floor: round(floor),
    room: round(balance - floor),
    tradingDays,
    requiredProfit: required === null ? null : round(required),
    profitToGo: required === null ? null : round(Math.max(0, required - profit)),
    consistency,
    payout,
    days: rows,
    approximate: rules.drawdown.type === 'intraday-trailing',
  };
}

/** What the account would look like after one more day with this result. */
export function previewNextDay(input: SimInput, pnl: number): AccountSim {
  return simulateAccount({
    ...input,
    days: [...input.days, { date: '9999-12-31', pnl }],
  });
}

/** Manual accounts: balances read from the platform become daily results. */
export function balanceUpdatesToDays(
  size: number,
  updates: { date: string; balance: number }[]
): DayResult[] {
  let previous = size;

  return [...updates]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(update => {
      const pnl = update.balance - previous;

      previous = update.balance;

      return { date: update.date, pnl };
    });
}
