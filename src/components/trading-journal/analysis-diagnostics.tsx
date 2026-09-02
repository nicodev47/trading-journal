'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { TradeDetailDialog } from '@/components/trading-journal/trade-detail-dialog';
import { TradeGroupDetailDialog } from '@/components/trading-journal/trade-group-detail-dialog';
import {
  CUSTOM_TAG_PREFIX,
  TRADE_TAGS,
  VALID_TRADE_SETUPS,
  isValidTradeSetup,
  type Trade,
} from '@/lib/types/trade';
import { cn } from '@/lib/utils';
import {
  calculateEclipseScore,
  calculateOperationalFrequency,
  calculateRiskRewardRatio,
  calculateTradeWinRate,
  formatRiskRewardRatio,
  getTradeOutcome,
  isValidStatTrade,
  MIN_TRADES_PER_WEEK,
} from '@/lib/calculations';
import { formatMonthYear } from '@/lib/date-utils';
import {
  getOperatingWindowName,
  type OperatingWindowName,
} from '@/lib/operating-windows';

interface AnalysisDiagnosticsProps {
  trades: Trade[];
  onUpdateTrade: (id: string, updates: Partial<Trade>) => void;
}

type TradeGroupDialogState = {
  title: string;
  subtitle?: string;
  trades: Trade[];
};

const ECLIPSE_SCORE_MAX_RISK_REWARD = 1.2;
const ECLIPSE_SCORE_TARGET_SESSION_CONSISTENCY = 0.7;

type ChartClickState = {
  activePayload?: Array<{
    payload?: {
      date?: string;
    };
  }>;
};

type TradeLogFilters = {
  direction: 'all' | 'long' | 'short';
  result: 'all' | 'profit' | 'loss' | 'missed';
  asset: 'all' | 'NQ' | 'MNQ';
  setup: string;
  tag: string;
  favoritesOnly: 'yes' | 'no';
  displayOrder: 'latest' | 'earliest' | 'profit-high' | 'profit-low';
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_TRADE_LOG_FILTERS: TradeLogFilters = {
  direction: 'all',
  result: 'all',
  asset: 'all',
  setup: 'all',
  tag: 'all',
  favoritesOnly: 'no',
  displayOrder: 'latest',
  dateFrom: '',
  dateTo: '',
};

const DEFAULT_VISIBLE_COUNT = 7;
const PAGE_SIZE = 12;

interface SetupStats {
  setup: string;
  trades: number;
  wins: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  totalPnl: number;
}

interface BreakdownTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: {
      name?: string;
      value?: number;
      percentage?: number;
      direction?: string;
      trades?: number;
      winRate?: number;
      totalPnl?: number;
    };
  }>;
  kind: 'setup' | 'direction';
  streamerMode?: boolean;
}

const WEEKDAYS = [
  { dayIndex: 1, short: 'Lun', label: 'Lunedì' },
  { dayIndex: 2, short: 'Mar', label: 'Martedì' },
  { dayIndex: 3, short: 'Mer', label: 'Mercoledì' },
  { dayIndex: 4, short: 'Gio', label: 'Giovedì' },
  { dayIndex: 5, short: 'Ven', label: 'Venerdì' },
] as const;

const SETUP_COLORS = [
  '#00f0a8',
  '#14b8a6',
  '#0f766e',
  '#5eead4',
  '#4f8f84',
  '#2f6f67',
  '#7aa89f',
  '#355b57',
];

function netPnl(trade: Trade) {
  return trade.pnl - trade.commission;
}

function normalizeScore(value: number) {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 100);
}

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-');

  if (!year || !month || !day) {
    return dateKey;
  }

  return `${day}/${month}`;
}

function getTradeDate(trade: Trade) {
  const date = new Date(trade.exitDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTradeSortTime(trade: Trade) {
  const dateValue = [trade.exitDate, trade.entryDate, trade.createdAt].find(
    (value) => {
      if (!value) return false;
      const date = new Date(value);

      return !Number.isNaN(date.getTime());
    }
  );

  return dateValue ? new Date(dateValue).getTime() : 0;
}

function getTradeTime(trade: Trade) {
  const time =
    trade.exitDate?.split('T')[1] || trade.entryDate?.split('T')[1] || '';
  return time.slice(0, 5) || '—';
}

function getEclipseMetricCardLabel(metric: string) {
  if (metric === 'Freq. operativa') return 'Frequenza operativa';
  if (metric === 'Costanza operativa') return 'Costanza Operativa';
  if (metric === 'Risk/Reward') return 'Risk-to-Reward Ratio';
  return metric;
}

function getTradeDateKey(trade: Trade) {
  return trade.exitDate.split('T')[0] || trade.entryDate.split('T')[0] || '';
}

function getSetupName(trade: Trade) {
  const setup = trade.strategy?.trim();

  return isValidTradeSetup(setup) ? setup : 'Senza Setup';
}

function getTagLabel(value: string) {
  const standardTag = TRADE_TAGS.find(
    (tag) => tag.value === value
  );
  if (standardTag) {
    return `${standardTag.emoji} ${standardTag.label}`;
  }
  return value.startsWith(CUSTOM_TAG_PREFIX)
    ? value.slice(CUSTOM_TAG_PREFIX.length)
    : value;
}

function formatCurrency(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function getScoreEvaluation(score: number) {
  if (score >= 90) return 'Eccellente';
  if (score >= 80) return 'Ottimo';
  if (score >= 60) return 'Buono';
  if (score >= 40) return 'Da migliorare';
  return 'Critico';
}

function EconomicValue({
  value,
  streamerMode,
  className,
}: {
  value: number;
  streamerMode: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        value > 0 && 'text-profit',
        value < 0 && 'text-loss',
        value === 0 && 'text-muted-foreground',
        className
      )}
    >
      {streamerMode ? '******' : formatCurrency(value)}
    </span>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-xl border border-border/70 bg-background/30 px-4 text-center font-mono text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function BreakdownTooltip({
  active,
  payload,
  kind,
  streamerMode = false,
}: BreakdownTooltipProps) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  if (kind === 'setup') {
    return (
      <div className="min-w-32 rounded-xl border border-teal-300/25 bg-[#20242d]/98 px-3 py-2.5 font-mono text-xs shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_18px_rgba(45,212,191,0.08)]">
        <p className="font-semibold text-white">{item.name || 'Untagged'}</p>
        <p className="mt-1 text-[11px] text-teal-200">
          {item.value ?? 0} trade · {Math.round(item.percentage ?? 0)}%
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-36 rounded-xl border border-teal-300/25 bg-[#20242d]/98 px-3 py-2.5 font-mono text-xs shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_18px_rgba(45,212,191,0.08)]">
      <p className="font-semibold text-white">{item.direction || '—'}</p>
      <p className="mt-1 text-[11px] text-slate-200">
        {item.trades ?? 0} trade · {Math.round(item.winRate ?? 0)}% WR
      </p>
      <p className="mt-1 text-[11px] font-semibold text-teal-200">
        P&amp;L:{' '}
        {streamerMode
          ? '******'
          : formatCurrency(item.totalPnl ?? 0)}
      </p>
    </div>
  );
}

function DailyPnlTooltip({
  active,
  payload,
  streamerMode = false,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      dateLabel?: string;
      dailyPnl?: number;
    };
  }>;
  streamerMode?: boolean;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div className="min-w-36 rounded-xl border border-teal-300/25 bg-[#20242d]/98 px-3 py-2.5 font-mono text-xs shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_18px_rgba(45,212,191,0.08)]">
      <p className="font-semibold text-white">{item.dateLabel || '—'}</p>
      <p className="mt-1 text-[11px] font-semibold text-teal-200">
        P&amp;L:{' '}
        {streamerMode
          ? '******'
          : formatCurrency(item.dailyPnl ?? 0)}
      </p>
    </div>
  );
}

function EclipseScoreTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      metric?: string;
      normalizedScore?: number;
      displayValue?: string;
      description?: string;
      tooltipValue?: string;
      targetValue?: string;
    };
  }>;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div className="min-w-40 rounded-xl border border-border bg-[#20242d]/98 px-3 py-2.5 font-mono text-xs shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_18px_rgba(45,212,191,0.08)]">
      <p className="font-semibold text-white">
        {item.metric ? getEclipseMetricCardLabel(item.metric) : '—'}
      </p>
      <p className="mt-1 text-[11px] font-semibold text-teal-200">
        Score: {Math.round(item.normalizedScore ?? 0)} / 100 ·{' '}
        {getScoreEvaluation(item.normalizedScore ?? 0)}
      </p>
      {item.displayValue && (
        <p className="mt-1 text-[11px] text-slate-200">
          Valore reale: {item.tooltipValue ?? item.displayValue}
        </p>
      )}
      {item.targetValue && (
        <p className="mt-1 text-[11px] text-slate-300">
          Target Eclipse: {item.targetValue}
        </p>
      )}
    </div>
  );
}

function MonthChartSelector({
  label,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: {
  label: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        disabled={!canGoPrevious}
        onClick={onPrevious}
        aria-label="Mese precedente"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[112px] rounded-md border border-border bg-card px-3 py-2 text-center font-mono text-xs font-semibold capitalize text-foreground">
        {label}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        disabled={!canGoNext}
        onClick={onNext}
        aria-label="Mese successivo"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function EclipseScoreAngleTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const label = payload?.value ?? '';
  let nextX = x;
  let nextY = y;
  let nextAnchor: 'start' | 'middle' | 'end' = 'middle';

  if (label === 'Winrate') {
    nextY -= 12;
  }

  if (label === 'Risk/Reward') {
    nextX += 22;
    nextAnchor = 'start';
  }

  if (label === 'Costanza operativa') {
    nextX -= 26;
    nextAnchor = 'end';
  }

  if (label === 'Freq. operativa') {
    nextY += 24;
  }

  return (
    <text
      x={nextX}
      y={nextY}
      textAnchor={nextAnchor}
      dominantBaseline="middle"
      fill="rgba(255,255,255,0.9)"
      style={{
        fontSize: 13,
        fontWeight: 700,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {label}
    </text>
  );
}

function CumulativePnlTooltip({
  active,
  payload,
  streamerMode = false,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      dateLabel?: string;
      cumulativePnl?: number;
    };
  }>;
  streamerMode?: boolean;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div className="min-w-40 rounded-xl border border-teal-300/25 bg-[#20242d]/98 px-3 py-2.5 font-mono text-xs shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_18px_rgba(45,212,191,0.08)]">
      <p className="font-semibold text-white">{item.dateLabel || '—'}</p>
      <p className="mt-1 text-[11px] font-semibold text-teal-200">
        P&amp;L cumulativo:{' '}
        {streamerMode
          ? '******'
          : formatCurrency(item.cumulativePnl ?? 0)}
      </p>
    </div>
  );
}

export function AnalysisDiagnostics({
  trades,
  onUpdateTrade,
}: AnalysisDiagnosticsProps) {
  const { streamerMode, sundayWeekStart } = useStreamerMode();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [tradeGroupDialog, setTradeGroupDialog] =
    useState<TradeGroupDialogState | null>(null);
  const [isTradeGroupOpen, setIsTradeGroupOpen] = useState(false);
  const [returnToTradeGroup, setReturnToTradeGroup] = useState(false);
  const [isTradeLogFilterOpen, setIsTradeLogFilterOpen] = useState(false);
  const [tradeLogFilters, setTradeLogFilters] = useState<TradeLogFilters>(
    DEFAULT_TRADE_LOG_FILTERS
  );
  const [isPaginationMode, setIsPaginationMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const data = useMemo(() => {
    const validStatTrades = trades.filter(isValidStatTrade);
    const weekdayStats = WEEKDAYS.map((weekday) => {
      const dayTrades = validStatTrades.filter(
        (trade) => getTradeDate(trade)?.getDay() === weekday.dayIndex
      );
      const wins = dayTrades.filter((trade) => getTradeOutcome(trade) === 'win').length;

      return {
        ...weekday,
        trades: dayTrades.length,
        totalPnl: dayTrades.reduce(
          (sum, trade) => sum + netPnl(trade),
          0
        ),
        winRate: calculateTradeWinRate(dayTrades),
      };
    });

    const setupMap = new Map<
      string,
      { trades: Trade[]; wins: number; totalPnl: number }
    >();

    validStatTrades.forEach((trade) => {
      const setup = getSetupName(trade);
      const current = setupMap.get(setup) ?? {
        trades: [],
        wins: 0,
        totalPnl: 0,
      };
      current.trades.push(trade);
      current.totalPnl += netPnl(trade);
      if (getTradeOutcome(trade) === 'win') current.wins += 1;
      setupMap.set(setup, current);
    });

    const setupStats: SetupStats[] = Array.from(setupMap.entries())
      .map(([setup, stats]) => {
        const winningValues = stats.trades
          .filter((trade) => getTradeOutcome(trade) === 'win')
          .map(netPnl);
        const losingValues = stats.trades
          .filter((trade) => getTradeOutcome(trade) === 'loss')
          .map(netPnl);

        return {
          setup,
          trades: stats.trades.length,
          wins: stats.wins,
          winRate: calculateTradeWinRate(stats.trades),
          avgWin: winningValues.length
            ? winningValues.reduce((sum, value) => sum + value, 0) /
              winningValues.length
            : 0,
          avgLoss: losingValues.length
            ? losingValues.reduce((sum, value) => sum + value, 0) /
              losingValues.length
            : 0,
          totalPnl: stats.totalPnl,
        };
      })
      .sort(
        (a, b) =>
          b.trades - a.trades || a.setup.localeCompare(b.setup, 'it')
      );

    const directionStats = (['long', 'short'] as const).map((direction) => {
      const directionTrades = validStatTrades.filter(
        (trade) => trade.direction === direction
      );
      return {
        direction: direction === 'long' ? 'Long' : 'Short',
        trades: directionTrades.length,
        winRate: calculateTradeWinRate(directionTrades),
        totalPnl: directionTrades.reduce(
          (sum, trade) => sum + netPnl(trade),
          0
        ),
        fill: direction === 'long' ? '#00f0a8' : '#ff4d70',
      };
    });

    const tradeLog = [...trades].sort(
      (a, b) => getTradeSortTime(b) - getTradeSortTime(a)
    );
    const winRate = calculateTradeWinRate(validStatTrades);
    const winRateScore = validStatTrades.length
      ? normalizeScore((winRate / 80) * 100)
      : 0;
    const riskRewardRatio = calculateRiskRewardRatio(validStatTrades).value;
    const riskRewardScore = riskRewardRatio === null
      ? 0
      : normalizeScore(
          (riskRewardRatio / ECLIPSE_SCORE_MAX_RISK_REWARD) * 100
        );
    const operationalFrequency = calculateOperationalFrequency(
      validStatTrades,
      sundayWeekStart ? 0 : 1
    );
    const frequencyScore = operationalFrequency.score;
    const sessionStats = new Map<
      OperatingWindowName,
      { trades: number; totalPnl: number }
    >();

    validStatTrades.forEach((trade) => {
      const label = getOperatingWindowName(trade);
      if (!label) return;

      const current = sessionStats.get(label) ?? { trades: 0, totalPnl: 0 };
      current.trades += 1;
      current.totalPnl += netPnl(trade);
      sessionStats.set(label, current);
    });

    const bestSessionEntry =
      Array.from(sessionStats.entries()).sort(
        (a, b) =>
          b[1].trades - a[1].trades ||
          b[1].totalPnl - a[1].totalPnl
      )[0];
    const bestSessionWindow = bestSessionEntry?.[0] ?? null;
    const bestSessionTradeCount = bestSessionEntry?.[1].trades ?? 0;
    const sessionTradeCount = Array.from(sessionStats.values()).reduce(
      (sum, session) => sum + session.trades,
      0
    );
    const hasSessionData =
      bestSessionWindow !== null && sessionTradeCount > 0;
    const sessionConsistency = hasSessionData
      ? bestSessionTradeCount / sessionTradeCount
      : 0;
    const sessionWindowScore = hasSessionData
      ? normalizeScore(
          (sessionConsistency /
            ECLIPSE_SCORE_TARGET_SESSION_CONSISTENCY) *
            100
        )
      : 0;
    const eclipseScoreComponents = [
      winRateScore,
      riskRewardScore,
      frequencyScore,
      sessionWindowScore,
    ];
    const eclipseScore = validStatTrades.length
      ? calculateEclipseScore(eclipseScoreComponents)
      : null;
    const eclipseRadarData = [
      {
        metric: 'Winrate',
        normalizedScore: winRateScore,
        displayValue: validStatTrades.length ? formatPercent(winRate) : '—',
        description: validStatTrades.length
          ? 'Percentuale trade vincenti'
          : 'Nessun dato disponibile',
      },
      {
        metric: 'Risk/Reward',
        normalizedScore: riskRewardScore,
        displayValue: formatRiskRewardRatio(riskRewardRatio),
        description: 'Rapporto Rischio / Rendimento',
        targetValue: ECLIPSE_SCORE_MAX_RISK_REWARD.toFixed(2),
      },
      {
        metric: 'Freq. operativa',
        normalizedScore: frequencyScore,
        displayValue: operationalFrequency.totalWeeks > 0
          ? `${operationalFrequency.weeksWithMinimumTrades}/${operationalFrequency.totalWeeks} settimane`
          : '—',
        description: operationalFrequency.totalWeeks > 0
          ? `Settimane con almeno ${MIN_TRADES_PER_WEEK} trade`
          : 'Nessun dato disponibile',
        tooltipValue: `${operationalFrequency.weeksWithMinimumTrades}/${operationalFrequency.totalWeeks} settimane con almeno ${MIN_TRADES_PER_WEEK} trade statistici validi`,
        targetValue: `Almeno ${MIN_TRADES_PER_WEEK} trade a settimana`,
      },
      {
        metric: 'Costanza operativa',
        normalizedScore: sessionWindowScore,
        displayValue: bestSessionWindow ?? '—',
        description: hasSessionData
          ? 'Fascia con la maggiore concentrazione di trade'
          : 'Nessun dato disponibile',
        tooltipValue: hasSessionData
          ? `${Math.round(
              sessionConsistency * 100
            )}% dei trade in ${bestSessionWindow} (${bestSessionTradeCount}/${sessionTradeCount})`
          : undefined,
        targetValue:
          'Almeno il 70% dei trade nella fascia più utilizzata',
      },
    ];
    const dailyPnlMap = new Map<string, number>();

    validStatTrades.forEach((trade) => {
      const dateKey =
        trade.exitDate.split('T')[0] || trade.entryDate.split('T')[0] || '';

      if (!dateKey) {
        return;
      }

      dailyPnlMap.set(dateKey, (dailyPnlMap.get(dateKey) ?? 0) + netPnl(trade));
    });

    let cumulativePnl = 0;
    const dailyPnlData = Array.from(dailyPnlMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dailyPnl]) => {
        cumulativePnl += dailyPnl;

        return {
          date,
          dateLabel: formatDateLabel(date),
          dailyPnl,
          cumulativePnl,
        };
      });
    const finalCumulativePnl =
      dailyPnlData.length > 0
        ? dailyPnlData[dailyPnlData.length - 1].cumulativePnl
        : 0;

    return {
      weekdayStats,
      setupStats,
      setupChartData: setupStats.map((setup) => ({
        name: setup.setup,
        value: setup.trades,
        percentage:
          validStatTrades.length > 0
            ? (setup.trades / validStatTrades.length) * 100
            : 0,
      })),
      directionStats,
      tradeLog,
      eclipseRadarData,
      eclipseScore,
      dailyPnlData,
      finalCumulativePnl,
      totalTrades: validStatTrades.length,
    };
  }, [sundayWeekStart, trades]);

  const availableDailyPnlMonths = useMemo(
    () =>
      Array.from(
        new Set(data.dailyPnlData.map((item) => item.date.slice(0, 7)))
      ).sort(),
    [data.dailyPnlData]
  );
  const [selectedCumulativePnlMonth, setSelectedCumulativePnlMonth] = useState<
    string | null
  >(null);
  const [selectedNetPnlMonth, setSelectedNetPnlMonth] = useState<string | null>(
    null
  );
  const latestDailyPnlMonth =
    availableDailyPnlMonths[availableDailyPnlMonths.length - 1] ?? null;
  const activeCumulativePnlMonth =
    selectedCumulativePnlMonth &&
    availableDailyPnlMonths.includes(selectedCumulativePnlMonth)
      ? selectedCumulativePnlMonth
      : latestDailyPnlMonth;
  const activeNetPnlMonth =
    selectedNetPnlMonth &&
    availableDailyPnlMonths.includes(selectedNetPnlMonth)
      ? selectedNetPnlMonth
      : latestDailyPnlMonth;
  const activeCumulativePnlMonthIndex = activeCumulativePnlMonth
    ? availableDailyPnlMonths.indexOf(activeCumulativePnlMonth)
    : -1;
  const activeNetPnlMonthIndex = activeNetPnlMonth
    ? availableDailyPnlMonths.indexOf(activeNetPnlMonth)
    : -1;
  const cumulativeMonthlyPnlData = useMemo(() => {
    let cumulativePnl = 0;

    const monthlyData = data.dailyPnlData
      .filter((item) => item.date.startsWith(activeCumulativePnlMonth ?? ''))
      .map((item) => {
        cumulativePnl += item.dailyPnl;

        return {
          ...item,
          cumulativePnl,
        };
      });

    if (monthlyData.length === 1) {
      return [
        {
          date: '',
          dateLabel: `01/${monthlyData[0].date.slice(5, 7)}`,
          dailyPnl: 0,
          cumulativePnl: 0,
        },
        ...monthlyData,
      ];
    }

    return monthlyData;
  }, [activeCumulativePnlMonth, data.dailyPnlData]);
  const netMonthlyPnlData = useMemo(
    () =>
      data.dailyPnlData.filter((item) =>
        item.date.startsWith(activeNetPnlMonth ?? '')
      ),
    [activeNetPnlMonth, data.dailyPnlData]
  );
  const monthlyFinalCumulativePnl =
    cumulativeMonthlyPnlData[cumulativeMonthlyPnlData.length - 1]
      ?.cumulativePnl ?? 0;
  const activeCumulativePnlMonthLabel = activeCumulativePnlMonth
    ? formatMonthYear(new Date(`${activeCumulativePnlMonth}-01T00:00:00`))
    : 'Nessun mese';
  const activeNetPnlMonthLabel = activeNetPnlMonth
    ? formatMonthYear(new Date(`${activeNetPnlMonth}-01T00:00:00`))
    : 'Nessun mese';

  const maxDirectionTrades = Math.max(
    ...data.directionStats.map((item) => item.trades),
    1
  );
  const availableSetups = useMemo(
    () => {
      const hasTradesWithoutSetup = data.tradeLog.some((trade) => {
        const setup = trade.strategy?.trim();

        return !isValidTradeSetup(setup);
      });

      return [
        ...VALID_TRADE_SETUPS.filter(setup =>
          data.tradeLog.some(trade => trade.strategy?.trim() === setup)
        ),
        ...(hasTradesWithoutSetup ? ['Senza Setup'] : []),
      ];
    },
    [data.tradeLog]
  );
  const availableTags = useMemo(
    () =>
      Array.from(
        new Set(
          data.tradeLog
            .flatMap((trade) => trade.tags ?? [])
            .filter((tag): tag is string => Boolean(tag))
        )
      ).sort((a, b) => a.localeCompare(b, 'it')),
    [data.tradeLog]
  );
  const hasActiveTradeLogFilters =
    tradeLogFilters.direction !== 'all' ||
    tradeLogFilters.result !== 'all' ||
    tradeLogFilters.asset !== 'all' ||
    tradeLogFilters.setup !== 'all' ||
    tradeLogFilters.tag !== 'all' ||
    tradeLogFilters.favoritesOnly !== 'no' ||
    tradeLogFilters.displayOrder !== 'latest' ||
    tradeLogFilters.dateFrom !== '' ||
    tradeLogFilters.dateTo !== '';
  const filteredTradeLog = useMemo(() => {
    const filteredTrades = data.tradeLog.filter((trade) => {
        const outcome = getTradeOutcome(trade);
        const dateKey =
          trade.exitDate.split('T')[0] || trade.entryDate.split('T')[0] || '';

        if (
          tradeLogFilters.direction !== 'all' &&
          trade.direction !== tradeLogFilters.direction
        ) {
          return false;
        }

        if (tradeLogFilters.result === 'profit' && outcome !== 'win') {
          return false;
        }

        if (tradeLogFilters.result === 'loss' && outcome !== 'loss') {
          return false;
        }

        if (tradeLogFilters.result === 'missed' && outcome !== 'missed') {
          return false;
        }

        if (
          tradeLogFilters.asset !== 'all' &&
          trade.pair !== tradeLogFilters.asset
        ) {
          return false;
        }

        if (
          tradeLogFilters.setup !== 'all' &&
          getSetupName(trade) !== tradeLogFilters.setup
        ) {
          return false;
        }

        if (
          tradeLogFilters.tag !== 'all' &&
          !(trade.tags ?? []).includes(tradeLogFilters.tag)
        ) {
          return false;
        }

        if (tradeLogFilters.favoritesOnly === 'yes' && !trade.isFavorite) {
          return false;
        }

        if (tradeLogFilters.dateFrom && dateKey < tradeLogFilters.dateFrom) {
          return false;
        }

        if (tradeLogFilters.dateTo && dateKey > tradeLogFilters.dateTo) {
          return false;
        }

        return true;
      });

    return filteredTrades.sort((a, b) => {
      if (tradeLogFilters.displayOrder === 'earliest') {
        return getTradeSortTime(a) - getTradeSortTime(b);
      }

      if (tradeLogFilters.displayOrder === 'profit-high') {
        return netPnl(b) - netPnl(a) ||
          getTradeSortTime(b) - getTradeSortTime(a);
      }

      if (tradeLogFilters.displayOrder === 'profit-low') {
        return netPnl(a) - netPnl(b) ||
          getTradeSortTime(b) - getTradeSortTime(a);
      }

      return getTradeSortTime(b) - getTradeSortTime(a);
    });
  }, [data.tradeLog, tradeLogFilters]);
  const totalTradeLogPages = Math.max(
    1,
    Math.ceil(filteredTradeLog.length / PAGE_SIZE)
  );
  const visibleTradeLogStartIndex = isPaginationMode
    ? (currentPage - 1) * PAGE_SIZE
    : 0;
  const visibleTradeLogEndIndex = isPaginationMode
    ? currentPage * PAGE_SIZE
    : DEFAULT_VISIBLE_COUNT;
  const visibleTradeLog = useMemo(
    () =>
      filteredTradeLog.slice(
        visibleTradeLogStartIndex,
        visibleTradeLogEndIndex
      ),
    [filteredTradeLog, visibleTradeLogEndIndex, visibleTradeLogStartIndex]
  );
  const visibleTradeLogFrom =
    filteredTradeLog.length > 0 ? visibleTradeLogStartIndex + 1 : 0;
  const visibleTradeLogTo = Math.min(
    visibleTradeLogEndIndex,
    filteredTradeLog.length
  );
  const hasMoreTradeLogRows =
    !isPaginationMode && filteredTradeLog.length > DEFAULT_VISIBLE_COUNT;
  const tradeLogPageNumbers = useMemo(
    () => Array.from({ length: totalTradeLogPages }, (_, index) => index + 1),
    [totalTradeLogPages]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [data.tradeLog, tradeLogFilters]);

  useEffect(() => {
    if (currentPage > totalTradeLogPages) {
      setCurrentPage(totalTradeLogPages);
    }
  }, [currentPage, totalTradeLogPages]);

  const cumulativeColor =
    monthlyFinalCumulativePnl >= 0 ? '#00f0a8' : '#ff4d70';
  const cumulativeGradientId =
    monthlyFinalCumulativePnl >= 0
      ? 'cumulativePnlProfitGradient'
      : 'cumulativePnlLossGradient';
  const maxPositiveDailyPnl = Math.max(
    ...netMonthlyPnlData
      .map((day) => day.dailyPnl)
      .filter((value) => value > 0),
    0
  );
  const minNegativeDailyPnl = Math.min(
    ...netMonthlyPnlData
      .map((day) => day.dailyPnl)
      .filter((value) => value < 0),
    0
  );
  const bestWeekday = data.weekdayStats
    .filter((day) => day.trades > 0)
    .sort(
      (a, b) =>
        b.winRate - a.winRate ||
        b.totalPnl - a.totalPnl ||
        b.trades - a.trades
    )[0];
  const getDailyPnlIntensity = (value: number) => {
    if (value > 0 && maxPositiveDailyPnl > 0) {
      return Math.min(value / maxPositiveDailyPnl, 1);
    }

    if (value < 0 && minNegativeDailyPnl < 0) {
      return Math.min(Math.abs(value) / Math.abs(minNegativeDailyPnl), 1);
    }

    return 0;
  };
  const getDailyPnlGradientColors = (value: number) => {
    const intensity = getDailyPnlIntensity(value);

    if (value > 0) {
      if (intensity > 0.75) {
        return { top: '#00d68f', bottom: '#008f64' };
      }

      if (intensity > 0.45) {
        return { top: '#00b87a', bottom: '#007a55' };
      }

      return { top: '#008f64', bottom: '#00684d' };
    }

    if (value < 0) {
      if (intensity > 0.75) {
        return { top: '#ff4d70', bottom: '#a92d4b' };
      }

      if (intensity > 0.45) {
        return { top: '#d93b5f', bottom: '#8f263f' };
      }

      return { top: '#a92d4b', bottom: '#7f2239' };
    }

    return { top: '#1f2937', bottom: '#111827' };
  };

  const openTradeGroup = (
    title: string,
    subtitle: string,
    groupTrades: Trade[]
  ) => {
    if (groupTrades.length === 0) {
      return;
    }

    setTradeGroupDialog({
      title,
      subtitle,
      trades: groupTrades,
    });
    setIsTradeGroupOpen(true);
    setReturnToTradeGroup(false);
  };

  const getTradesByDate = (dateKey: string) =>
    trades.filter(
      (trade) =>
        isValidStatTrade(trade) && getTradeDateKey(trade) === dateKey
    );

  const openDailyTradeGroup = (
    dateKey: string,
    titlePrefix: string,
    subtitle: string
  ) => {
    const dateLabel = formatDateLabel(dateKey);
    openTradeGroup(
      `${titlePrefix} ${dateLabel}`,
      subtitle,
      getTradesByDate(dateKey)
    );
  };

  const openSetupTradeGroup = (setup: string) => {
    openTradeGroup(
      `Setup: ${setup}`,
      'Tutti i trade associati a questo setup.',
      trades.filter(
        (trade) => isValidStatTrade(trade) && getSetupName(trade) === setup
      )
    );
  };

  const openDirectionTradeGroup = (directionLabel: string) => {
    const direction = directionLabel.toLowerCase() as Trade['direction'];
    openTradeGroup(
      `Trade ${directionLabel}`,
      'Tutte le operazioni filtrate per direzione.',
      trades.filter(
        (trade) => isValidStatTrade(trade) && trade.direction === direction
      )
    );
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Performance per giorno della settimana
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {data.weekdayStats.map((day) => (
            <div
              key={day.short}
              className={cn(
                'rounded-[14px] border border-border bg-background/35 p-3 transition-colors',
                day.trades > 0 &&
                  'cursor-pointer hover:border-profit/40 hover:bg-secondary/25'
              )}
              onClick={() =>
                openTradeGroup(
                  `Trade del ${day.label}`,
                  'Tutte le operazioni eseguite in questo giorno della settimana.',
                  trades.filter(
                    (trade) =>
                      isValidStatTrade(trade) &&
                      getTradeDate(trade)?.getDay() === day.dayIndex
                  )
                )
              }
            >
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {day.short}
                {bestWeekday?.short === day.short && (
                  <span className="ml-1 text-amber-300">👑</span>
                )}
              </p>
              {day.trades === 0 ? (
                <p className="mt-3 font-mono text-lg font-semibold text-muted-foreground">
                  —
                </p>
              ) : (
                <>
                  <EconomicValue
                    value={day.totalPnl}
                    streamerMode={streamerMode}
                    className="mt-3 block font-mono text-sm font-semibold"
                  />
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {day.trades}T · {formatPercent(day.winRate)} WR
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Breakdown
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
            <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Trade per setup
            </h3>

            {data.setupChartData.length === 0 ? (
              <div className="mt-4">
                <EmptyState>Nessun setup registrato.</EmptyState>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.75fr)]">
                <div className="h-64 min-w-0 overflow-visible outline-none focus:outline-none [&_*]:outline-none [&_.recharts-wrapper]:overflow-visible">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart
                      className="[&_*]:outline-none"
                      tabIndex={-1}
                    >
                      <defs>
                        {data.setupChartData.map((entry, index) => (
                          <linearGradient
                            key={`setupGradient-${entry.name}`}
                            id={`setupGradient-${index}`}
                            x1="0"
                            y1="1"
                            x2="1"
                            y2="0"
                          >
                            <stop
                              offset="0%"
                              stopColor={SETUP_COLORS[index % SETUP_COLORS.length]}
                              stopOpacity={0.45}
                            />
                            <stop
                              offset="100%"
                              stopColor={SETUP_COLORS[index % SETUP_COLORS.length]}
                              stopOpacity={1}
                            />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={data.setupChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={90}
                        paddingAngle={
                          data.setupChartData.length > 1 ? 3 : 0
                        }
                        cornerRadius={
                          data.setupChartData.length > 1 ? 4 : 0
                        }
                        stroke="transparent"
                        tabIndex={-1}
                        focusable={false}
                        onClick={(entry: { name?: string }) => {
                          if (entry.name) {
                            openSetupTradeGroup(entry.name);
                          }
                        }}
                      >
                        {data.setupChartData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={`url(#setupGradient-${index})`}
                            stroke="transparent"
                            strokeWidth={1}
                            className="cursor-pointer outline-none transition-all duration-200 focus:outline-none hover:brightness-125 hover:[filter:drop-shadow(0_0_7px_rgba(45,212,191,0.45))]"
                            tabIndex={-1}
                            focusable={false}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={
                          <BreakdownTooltip
                            kind="setup"
                          />
                        }
                        wrapperStyle={{ zIndex: 30, outline: 'none' }}
                        allowEscapeViewBox={{ x: false, y: false }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {data.setupChartData.map((setup, index) => (
                    <div
                      key={setup.name}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 font-mono text-xs transition-colors hover:bg-secondary/30"
                      onClick={() => openSetupTradeGroup(setup.name)}
                    >
                      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                        <span
                          className="size-2.5 shrink-0 rounded-sm"
                          style={{
                            backgroundColor:
                              SETUP_COLORS[index % SETUP_COLORS.length],
                          }}
                        />
                        <span className="truncate">{setup.name}</span>
                      </span>
                      <span className="font-semibold text-foreground">
                        {setup.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
            <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Long vs Short
            </h3>

            {data.totalTrades === 0 ? (
              <div className="mt-4">
                <EmptyState>Nessun trade disponibile.</EmptyState>
              </div>
            ) : (
              <>
                <div className="mt-4 h-48 overflow-visible [&_.recharts-wrapper]:overflow-visible">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.directionStats}
                      margin={{ top: 18, right: 12, left: -24, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="longDirectionGradient"
                          x1="0"
                          y1="1"
                          x2="0"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#064e3b" />
                          <stop offset="100%" stopColor="#00f0a8" />
                        </linearGradient>
                        <linearGradient
                          id="shortDirectionGradient"
                          x1="0"
                          y1="1"
                          x2="0"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#7f1d3b" />
                          <stop offset="100%" stopColor="#ff4d70" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.08)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="direction"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[0, maxDirectionTrades]}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        content={
                          <BreakdownTooltip
                            kind="direction"
                            streamerMode={streamerMode}
                          />
                        }
                        wrapperStyle={{ zIndex: 30, outline: 'none' }}
                        allowEscapeViewBox={{ x: false, y: false }}
                      />
                      <Bar
                        dataKey="trades"
                        radius={[7, 7, 0, 0]}
                        onClick={(entry: { direction?: string }) => {
                          if (entry.direction) {
                            openDirectionTradeGroup(entry.direction);
                          }
                        }}
                      >
                        {data.directionStats.map((item) => (
                          <Cell
                            key={item.direction}
                            fill={
                              item.direction === 'Long'
                                ? 'url(#longDirectionGradient)'
                                : 'url(#shortDirectionGradient)'
                            }
                            className="cursor-pointer transition-all duration-200 hover:brightness-125 hover:[filter:drop-shadow(0_0_7px_rgba(45,212,191,0.38))]"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {data.directionStats.map((item) => (
                    <div
                      key={item.direction}
                      className={cn(
                        'rounded-xl border border-border bg-background/35 p-3 transition-colors',
                        item.trades > 0 &&
                          'cursor-pointer hover:border-profit/40 hover:bg-secondary/25'
                      )}
                      onClick={() => openDirectionTradeGroup(item.direction)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs font-semibold text-foreground">
                          {item.direction}
                        </p>
                        <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-border bg-background/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                          {item.trades}
                        </span>
                      </div>
                      <EconomicValue
                        value={item.totalPnl}
                        streamerMode={streamerMode}
                        className="mt-1 block font-mono text-xs font-semibold"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1">
          <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              ECLIPSE SCORE
            </h2>

            {data.eclipseScore === null ? (
              <div className="mt-4">
                <EmptyState>Nessun dato disponibile.</EmptyState>
              </div>
            ) : (
              <div className="mx-auto mt-4 h-[340px] max-w-5xl sm:h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    data={data.eclipseRadarData}
                    outerRadius="72%"
                    margin={{ top: 38, right: 70, bottom: 52, left: 70 }}
                  >
                    <defs>
                      <linearGradient
                        id="eclipseScoreFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#00f0a8"
                          stopOpacity={0.42}
                        />
                        <stop
                          offset="100%"
                          stopColor="#00f0a8"
                          stopOpacity={0.08}
                        />
                      </linearGradient>
                    </defs>
                    <PolarGrid
                      stroke="rgba(94,234,212,0.18)"
                      radialLines
                    />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={<EclipseScoreAngleTick />}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                      tickCount={5}
                    />
                    <Radar
                      dataKey="normalizedScore"
                      stroke="#00f0a8"
                      strokeWidth={2}
                      fill="url(#eclipseScoreFill)"
                      fillOpacity={1}
                      dot={{ r: 3, fill: '#00f0a8', strokeWidth: 0 }}
                      isAnimationActive
                      animationDuration={650}
                    />
                    <Tooltip
                      cursor={false}
                      content={<EclipseScoreTooltip />}
                      wrapperStyle={{ zIndex: 30, outline: 'none' }}
                      allowEscapeViewBox={{ x: false, y: false }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="mt-3 text-center">
              <p className="font-mono text-sm font-semibold text-foreground">
                Eclipse Score:{' '}
                {data.eclipseScore === null
                  ? '—'
                  : data.eclipseScore.toFixed(1)}
              </p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                Basato su winrate, risk-to-reward ratio, frequenza e costanza operativa.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {data.eclipseRadarData.map((metric) => (
                <div
                  key={metric.metric}
                  className="min-w-0 rounded-xl border border-border bg-background/35 p-3"
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    {getEclipseMetricCardLabel(metric.metric)}
                  </p>
                  <p className="mt-2 break-words font-mono text-sm font-semibold leading-tight text-foreground">
                    {metric.displayValue}
                  </p>
                  <p className="mt-1 break-words font-mono text-[10px] leading-snug text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0 rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                P&amp;L CUMULATIVO GIORNALIERO
              </h2>
              <MonthChartSelector
                label={activeCumulativePnlMonthLabel}
                canGoPrevious={activeCumulativePnlMonthIndex > 0}
                canGoNext={
                  activeCumulativePnlMonthIndex >= 0 &&
                  activeCumulativePnlMonthIndex <
                    availableDailyPnlMonths.length - 1
                }
                onPrevious={() =>
                  setSelectedCumulativePnlMonth(
                    availableDailyPnlMonths[
                      activeCumulativePnlMonthIndex - 1
                    ]
                  )
                }
                onNext={() =>
                  setSelectedCumulativePnlMonth(
                    availableDailyPnlMonths[
                      activeCumulativePnlMonthIndex + 1
                    ]
                  )
                }
              />
            </div>

            {cumulativeMonthlyPnlData.length === 0 ? (
              <div className="mt-4">
                <EmptyState>Nessun dato disponibile.</EmptyState>
              </div>
            ) : (
              <div className="mt-4 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={cumulativeMonthlyPnlData}
                    margin={{ top: 10, right: 10, left: 28, bottom: 0 }}
                    onClick={(state: ChartClickState) => {
                      const dateKey = state.activePayload?.[0]?.payload?.date;

                      if (dateKey) {
                        openDailyTradeGroup(
                          dateKey,
                          'Trade del',
                          'Operazioni incluse nel P&L cumulativo giornaliero.'
                        );
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <defs>
                      <linearGradient
                        id={cumulativeGradientId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={cumulativeColor}
                          stopOpacity={0.42}
                        />
                        <stop
                          offset="100%"
                          stopColor={cumulativeColor}
                          stopOpacity={0.04}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.08)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) =>
                        `${Number(value).toLocaleString('it-IT', {
                          maximumFractionDigits: 0,
                        })} USD`
                      }
                    />
                    <Tooltip
                      cursor={{ stroke: 'rgba(94,234,212,0.22)' }}
                      content={
                        <CumulativePnlTooltip streamerMode={streamerMode} />
                      }
                      wrapperStyle={{ zIndex: 30, outline: 'none' }}
                      allowEscapeViewBox={{ x: false, y: false }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulativePnl"
                      stroke={cumulativeColor}
                      strokeWidth={2}
                      fill={`url(#${cumulativeGradientId})`}
                      dot={{ r: 2, fill: cumulativeColor, strokeWidth: 0 }}
                      activeDot={{
                        r: 4,
                        fill: cumulativeColor,
                        strokeWidth: 0,
                        cursor: 'pointer',
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="min-w-0 rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                P&amp;L NETTO GIORNALIERO
              </h2>
              <MonthChartSelector
                label={activeNetPnlMonthLabel}
                canGoPrevious={activeNetPnlMonthIndex > 0}
                canGoNext={
                  activeNetPnlMonthIndex >= 0 &&
                  activeNetPnlMonthIndex < availableDailyPnlMonths.length - 1
                }
                onPrevious={() =>
                  setSelectedNetPnlMonth(
                    availableDailyPnlMonths[activeNetPnlMonthIndex - 1]
                  )
                }
                onNext={() =>
                  setSelectedNetPnlMonth(
                    availableDailyPnlMonths[activeNetPnlMonthIndex + 1]
                  )
                }
              />
            </div>

            {netMonthlyPnlData.length === 0 ? (
              <div className="mt-4">
                <EmptyState>Nessun dato disponibile.</EmptyState>
              </div>
            ) : (
              <div className="mt-4 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={netMonthlyPnlData}
                    margin={{ top: 10, right: 10, left: 28, bottom: 0 }}
                  >
                    <defs>
                      {netMonthlyPnlData.map((item) => {
                        const colors = getDailyPnlGradientColors(item.dailyPnl);

                        return (
                          <linearGradient
                            key={`dailyPnlGradient-${item.date}`}
                            id={`dailyPnlGradient-${item.date}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor={colors.top} stopOpacity={1} />
                            <stop offset="100%" stopColor={colors.bottom} stopOpacity={1} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.08)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) =>
                        `${Number(value).toLocaleString('it-IT', {
                          maximumFractionDigits: 0,
                        })} USD`
                      }
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      content={
                        <DailyPnlTooltip streamerMode={streamerMode} />
                      }
                      wrapperStyle={{ zIndex: 30, outline: 'none' }}
                      allowEscapeViewBox={{ x: false, y: false }}
                    />
                    <Bar
                      dataKey="dailyPnl"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry: { date?: string }) => {
                        if (entry.date) {
                          openDailyTradeGroup(
                            entry.date,
                            'P&L netto del',
                            'Tutte le operazioni eseguite in questa giornata.'
                          );
                        }
                      }}
                    >
                      {netMonthlyPnlData.map((item) => (
                        <Cell
                          key={item.date}
                          fill={
                            `url(#dailyPnlGradient-${item.date})`
                          }
                          fillOpacity={1}
                          className="cursor-pointer transition-all duration-200 hover:brightness-125 hover:[filter:drop-shadow(0_0_7px_rgba(45,212,191,0.38))]"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Setup breakdown
          </h2>
        </div>

        {data.setupStats.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState>Nessun setup registrato.</EmptyState>
          </div>
        ) : (
          <div className="ej-scrollbar overflow-x-auto">
            <table className="w-full min-w-[900px] font-mono text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Setup</th>
                  <th className="px-4 py-3 font-medium">Trades</th>
                  <th className="px-4 py-3 font-medium">Winrate</th>
                  <th className="px-4 py-3 font-medium">Vincita media</th>
                  <th className="px-4 py-3 font-medium">Perdita media</th>
                  <th className="px-4 py-3 font-medium">P&amp;L totale</th>
                  <th className="px-4 py-3 text-center font-medium">Azione</th>
                </tr>
              </thead>
              <tbody>
                {data.setupStats.map((setup) => (
                  <tr
                    key={setup.setup}
                    className="border-b border-border/70 last:border-b-0"
                  >
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {setup.setup}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {setup.trades}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatPercent(setup.winRate)}
                    </td>
                    <td className="px-4 py-3">
                      <EconomicValue
                        value={setup.avgWin}
                        streamerMode={streamerMode}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <EconomicValue
                        value={setup.avgLoss}
                        streamerMode={streamerMode}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      <EconomicValue
                        value={setup.totalPnl}
                        streamerMode={streamerMode}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-lg border-border bg-background/50 px-3 font-mono text-xs text-muted-foreground hover:border-profit/50 hover:bg-secondary hover:text-foreground"
                        onClick={() => openSetupTradeGroup(setup.setup)}
                      >
                        Apri
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Trade log
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-2 rounded-lg border-border bg-background/50 px-3 font-sans text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => setIsTradeLogFilterOpen((isOpen) => !isOpen)}
          >
            <SlidersHorizontal className="size-4" />
            Filtri
          </Button>
        </div>

        {isTradeLogFilterOpen && (
          <div className="border-b border-border bg-background/25 px-4 py-4 sm:px-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <FilterField label="Direzione">
                <select
                  value={tradeLogFilters.direction}
                  onChange={(event) =>
                    setTradeLogFilters((filters) => ({
                      ...filters,
                      direction: event.target.value as TradeLogFilters['direction'],
                    }))
                  }
                  className="ej-filter-select h-9 rounded-lg border border-border bg-background/60 px-3 font-sans text-xs text-foreground outline-none transition-colors hover:bg-secondary/40 focus:border-profit/60"
                >
                  <option value="all">Tutti</option>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </FilterField>

              <FilterField label="Risultato">
                <select
                  value={tradeLogFilters.result}
                  onChange={(event) =>
                    setTradeLogFilters((filters) => ({
                      ...filters,
                      result: event.target.value as TradeLogFilters['result'],
                    }))
                  }
                  className="ej-filter-select h-9 rounded-lg border border-border bg-background/60 px-3 font-sans text-xs text-foreground outline-none transition-colors hover:bg-secondary/40 focus:border-profit/60"
                >
                  <option value="all">Tutti</option>
                  <option value="profit">Profit</option>
                  <option value="loss">Loss</option>
                  <option value="missed">Missed</option>
                </select>
              </FilterField>

              <FilterField label="Asset">
                <select
                  value={tradeLogFilters.asset}
                  onChange={(event) =>
                    setTradeLogFilters((filters) => ({
                      ...filters,
                      asset: event.target.value as TradeLogFilters['asset'],
                    }))
                  }
                  className="ej-filter-select h-9 rounded-lg border border-border bg-background/60 px-3 font-sans text-xs text-foreground outline-none transition-colors hover:bg-secondary/40 focus:border-profit/60"
                >
                  <option value="all">Tutti</option>
                  <option value="NQ">NQ</option>
                  <option value="MNQ">MNQ</option>
                </select>
              </FilterField>

              <FilterField label="Setup">
                <select
                  value={tradeLogFilters.setup}
                  onChange={(event) =>
                    setTradeLogFilters((filters) => ({
                      ...filters,
                      setup: event.target.value,
                    }))
                  }
                  className="ej-filter-select h-9 rounded-lg border border-border bg-background/60 px-3 font-sans text-xs text-foreground outline-none transition-colors hover:bg-secondary/40 focus:border-profit/60"
                >
                  <option value="all">Tutti</option>
                  {availableSetups.map((setup) => (
                    <option key={setup} value={setup}>
                      {setup}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Tag">
                <select
                  value={tradeLogFilters.tag}
                  onChange={(event) =>
                    setTradeLogFilters((filters) => ({
                      ...filters,
                      tag: event.target.value,
                    }))
                  }
                  className="ej-filter-select h-9 rounded-lg border border-border bg-background/60 px-3 font-sans text-xs text-foreground outline-none transition-colors hover:bg-secondary/40 focus:border-profit/60"
                >
                  <option value="all">Tutti</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {getTagLabel(tag)}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Mostra solo Preferiti">
                <select
                  value={tradeLogFilters.favoritesOnly}
                  onChange={(event) =>
                    setTradeLogFilters((filters) => ({
                      ...filters,
                      favoritesOnly: event.target
                        .value as TradeLogFilters['favoritesOnly'],
                    }))
                  }
                  className="ej-filter-select h-9 rounded-lg border border-border bg-background/60 px-3 font-sans text-xs text-foreground outline-none transition-colors hover:bg-secondary/40 focus:border-profit/60"
                >
                  <option value="no">No</option>
                  <option value="yes">Sì</option>
                </select>
              </FilterField>

              <FilterField label="Ordine di Visualizzazione">
                <select
                  value={tradeLogFilters.displayOrder}
                  onChange={(event) =>
                    setTradeLogFilters((filters) => ({
                      ...filters,
                      displayOrder: event.target
                        .value as TradeLogFilters['displayOrder'],
                    }))
                  }
                  className="ej-filter-select h-9 rounded-lg border border-border bg-background/60 px-3 font-sans text-xs text-foreground outline-none transition-colors hover:bg-secondary/40 focus:border-profit/60"
                >
                  <option value="latest">Trade più recente</option>
                  <option value="earliest">Trade meno recente</option>
                  <option value="profit-high">Profitto più alto</option>
                  <option value="profit-low">Profitto più basso</option>
                </select>
              </FilterField>

              <div className="grid grid-cols-2 gap-2">
                <FilterField label="Da">
                  <input
                    type="date"
                    value={tradeLogFilters.dateFrom}
                    onChange={(event) =>
                      setTradeLogFilters((filters) => ({
                        ...filters,
                        dateFrom: event.target.value,
                      }))
                    }
                    className="ej-date-input-no-indicator h-9 min-w-0 rounded-lg border border-border bg-background/60 px-3 font-sans text-xs text-foreground outline-none transition-colors hover:bg-secondary/40 focus:border-profit/60"
                  />
                </FilterField>
                <FilterField label="A">
                  <input
                    type="date"
                    value={tradeLogFilters.dateTo}
                    onChange={(event) =>
                      setTradeLogFilters((filters) => ({
                        ...filters,
                        dateTo: event.target.value,
                      }))
                    }
                    className="ej-date-input-no-indicator h-9 min-w-0 rounded-lg border border-border bg-background/60 px-3 font-sans text-xs text-foreground outline-none transition-colors hover:bg-secondary/40 focus:border-profit/60"
                  />
                </FilterField>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] text-muted-foreground">
                {filteredTradeLog.length} / {data.tradeLog.length} trade
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-border bg-background/50 px-3 font-sans text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                disabled={!hasActiveTradeLogFilters}
                onClick={() => setTradeLogFilters(DEFAULT_TRADE_LOG_FILTERS)}
              >
                Reset filtri
              </Button>
            </div>
          </div>
        )}

        {data.tradeLog.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState>Nessuna operazione da mostrare.</EmptyState>
          </div>
        ) : filteredTradeLog.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState>Nessun trade trovato con i filtri selezionati.</EmptyState>
          </div>
        ) : (
          <>
            <div className="ej-scrollbar overflow-x-auto">
              <table className="w-full min-w-[1080px] table-fixed font-mono text-xs">
                <colgroup>
                  <col className="w-[118px]" />
                  <col className="w-[126px]" />
                  <col className="w-[92px]" />
                  <col className="w-[150px]" />
                  <col className="w-[82px]" />
                  <col className="w-[90px]" />
                  <col />
                  <col className="w-[92px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">P&amp;L</th>
                    <th className="px-4 py-3 font-medium">Direzione</th>
                    <th className="px-4 py-3 font-medium">Setup</th>
                    <th className="px-4 py-3 font-medium">Orario</th>
                    <th className="px-4 py-3 font-medium">Asset</th>
                    <th className="px-4 py-3 font-medium">Note</th>
                    <th className="px-4 py-3 text-center font-medium">Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTradeLog.map((trade) => {
                    const date = getTradeDate(trade);
                    const pnl = netPnl(trade);

                    return (
                      <tr
                        key={trade.id}
                        className="h-[72px] border-b border-border/70 last:border-b-0"
                      >
                        <td className="align-middle px-4 py-2 text-foreground">
                          {date
                            ? date.toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="align-middle px-4 py-2 font-semibold">
                          <EconomicValue
                            value={pnl}
                            streamerMode={streamerMode}
                          />
                        </td>
                        <td className="align-middle px-4 py-2 capitalize text-muted-foreground">
                          {trade.direction || '—'}
                        </td>
                        <td className="truncate align-middle px-4 py-2 text-muted-foreground">
                          {trade.strategy?.trim() || '—'}
                        </td>
                        <td className="align-middle px-4 py-2 text-muted-foreground">
                          {getTradeTime(trade)}
                        </td>
                        <td className="align-middle px-4 py-2 text-muted-foreground">
                          {trade.pair?.trim() || '—'}
                        </td>
                        <td className="align-middle px-4 py-2">
                          <div
                            className="max-w-[420px] overflow-hidden text-[10px] leading-[1.4] text-muted-foreground"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {trade.notes?.trim() || '—'}
                          </div>
                        </td>
                        <td className="align-middle px-4 py-2 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-[10px] px-3 font-mono text-xs"
                            onClick={() => {
                              setReturnToTradeGroup(false);
                              setSelectedTrade(trade);
                            }}
                          >
                            Apri
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
              <span className="font-mono text-[10px] text-muted-foreground">
                {isPaginationMode
                  ? `Mostrati ${visibleTradeLogFrom}-${visibleTradeLogTo} di ${filteredTradeLog.length}`
                  : `Mostrati ${visibleTradeLog.length} di ${filteredTradeLog.length}`}{' '}
                trade{hasActiveTradeLogFilters ? ' filtrati' : ''}
              </span>

              {hasMoreTradeLogRows && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 min-w-8 rounded-lg border-border bg-background/50 px-2 font-mono text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                  onClick={() => {
                    setIsPaginationMode(true);
                    setCurrentPage(1);
                  }}
                >
                  Mostra altri
                </Button>
              )}

              {isPaginationMode && (
                <div className="mr-2 flex flex-wrap items-center justify-end gap-1.5 sm:mr-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 min-w-8 rounded-lg border border-border bg-background/50 px-2 font-mono text-xs text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    &lt;
                  </Button>

                  {tradeLogPageNumbers.map((page) => (
                    <Button
                      key={page}
                      type="button"
                      variant={page === currentPage && page !== 1 ? 'default' : 'outline'}
                      size="sm"
                      className={
                        page === currentPage && page !== 1
                          ? 'h-8 min-w-8 rounded-lg border border-profit bg-profit px-2 font-mono text-xs font-bold text-background hover:bg-profit hover:text-background'
                          : 'h-8 min-w-8 rounded-lg border border-border bg-background/50 px-2 font-mono text-xs text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 min-w-8 rounded-lg border border-border bg-background/50 px-2 font-mono text-xs text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={currentPage === totalTradeLogPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalTradeLogPages, page + 1)
                      )
                    }
                  >
                    &gt;
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <TradeDetailDialog
        trade={selectedTrade}
        streamerMode={streamerMode}
        onUpdateTrade={(id, updates) => {
          onUpdateTrade(id, updates);
          setSelectedTrade((currentTrade) =>
            currentTrade?.id === id
              ? { ...currentTrade, ...updates }
              : currentTrade
          );
        }}
        onClose={() => {
          setSelectedTrade(null);
          setReturnToTradeGroup(false);
        }}
        showBackButton={returnToTradeGroup}
        onBack={() => {
          setSelectedTrade(null);
          if (returnToTradeGroup) {
            setIsTradeGroupOpen(true);
          }
        }}
      />
      <TradeGroupDetailDialog
        open={isTradeGroupOpen && Boolean(tradeGroupDialog)}
        onOpenChange={(open) => {
          setIsTradeGroupOpen(open);
          if (!open) setReturnToTradeGroup(false);
        }}
        title={tradeGroupDialog?.title ?? ''}
        subtitle={tradeGroupDialog?.subtitle}
        trades={tradeGroupDialog?.trades ?? []}
        onOpenTrade={(trade) => {
          setIsTradeGroupOpen(false);
          setSelectedTrade(trade);
          setReturnToTradeGroup(true);
        }}
      />
    </section>
  );
}
