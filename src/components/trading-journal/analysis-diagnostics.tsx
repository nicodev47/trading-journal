'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExternalLink, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import {
  CUSTOM_MISTAKE_PREFIX,
  TRADE_MISTAKES,
  type ScreenshotData,
  type Trade,
} from '@/lib/types/trade';
import { cn } from '@/lib/utils';

interface AnalysisDiagnosticsProps {
  trades: Trade[];
}

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
  { dayIndex: 1, short: 'Lun' },
  { dayIndex: 2, short: 'Mar' },
  { dayIndex: 3, short: 'Mer' },
  { dayIndex: 4, short: 'Gio' },
  { dayIndex: 5, short: 'Ven' },
  { dayIndex: 6, short: 'Sab' },
  { dayIndex: 0, short: 'Dom' },
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

function getTradeDate(trade: Trade) {
  const date = new Date(trade.exitDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTradeTime(trade: Trade) {
  const time =
    trade.exitDate?.split('T')[1] || trade.entryDate?.split('T')[1] || '';
  return time.slice(0, 5) || '—';
}

function getSetupName(trade: Trade) {
  return trade.strategy?.trim() || 'Untagged';
}

function normalizeScreenshots(trade: Trade): ScreenshotData[] {
  return (trade.screenshots ?? [])
    .map((screenshot, index) => {
      if (
        typeof screenshot === 'object' &&
        screenshot !== null &&
        'url' in screenshot
      ) {
        return {
          url: screenshot.url,
          name: screenshot.name || `Allegato ${index + 1}`,
        };
      }

      if (typeof screenshot === 'string') {
        try {
          const parsed = JSON.parse(screenshot) as Partial<ScreenshotData>;
          if (parsed && typeof parsed.url === 'string') {
            return {
              url: parsed.url,
              name: parsed.name || `Allegato ${index + 1}`,
            };
          }
        } catch {
          // Plain URLs and base64 images are valid legacy values.
        }

        return { url: screenshot, name: `Allegato ${index + 1}` };
      }

      return null;
    })
    .filter((screenshot): screenshot is ScreenshotData =>
      Boolean(screenshot?.url)
    );
}

function getImageUrl(url: string) {
  if (url.startsWith('data:image/')) return url;
  if (url.includes('s3.tradingview.com/snapshots')) return url;

  const tradingViewMatch = url.match(
    /tradingview\.com\/x\/([A-Za-z0-9]+)/
  );
  return tradingViewMatch
    ? `https://s3.tradingview.com/snapshots/t/${tradingViewMatch[1]}.png`
    : url;
}

function canPreviewImage(url: string) {
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    url.startsWith('data:image/') ||
    url.startsWith('blob:') ||
    url.includes('s3.tradingview.com/snapshots') ||
    /tradingview\.com\/x\/[A-Za-z0-9]+/.test(url) ||
    /\.(png|jpe?g|webp|gif|avif|svg)$/.test(cleanUrl)
  );
}

function getLinkLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.startsWith('data:image/') ? 'Immagine locale' : 'Link allegato';
  }
}

function getMistakeLabel(value: string) {
  const standardMistake = TRADE_MISTAKES.find(
    (mistake) => mistake.value === value
  );
  if (standardMistake) {
    return `${standardMistake.emoji} ${standardMistake.label}`;
  }
  return value.startsWith(CUSTOM_MISTAKE_PREFIX)
    ? value.slice(CUSTOM_MISTAKE_PREFIX.length)
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

function DetailCard({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/80 bg-background/35 p-3',
        className
      )}
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 font-mono text-xs text-foreground">{children}</div>
    </div>
  );
}

function AttachmentItem({
  screenshot,
  index,
}: {
  screenshot: ScreenshotData;
  index: number;
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const showPreview = canPreviewImage(screenshot.url) && !previewFailed;
  const name = screenshot.name || `Allegato ${index + 1}`;

  if (!showPreview) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5 transition-colors hover:bg-secondary/40">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs font-semibold text-foreground">
            {name}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {getLinkLabel(screenshot.url)}
          </p>
        </div>
        <a
          href={screenshot.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 font-mono text-[10px] text-foreground transition-colors hover:border-profit/40 hover:text-profit"
        >
          Apri <ExternalLink className="size-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/70">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <span className="truncate text-xs text-foreground">{name}</span>
        <a
          href={screenshot.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs text-profit hover:underline"
        >
          Apri <ExternalLink className="size-3" />
        </a>
      </div>
      <img
        src={getImageUrl(screenshot.url)}
        alt={name}
        className="max-h-64 w-full bg-background/40 object-contain"
        onError={() => setPreviewFailed(true)}
      />
    </div>
  );
}

export function AnalysisDiagnostics({ trades }: AnalysisDiagnosticsProps) {
  const { streamerMode } = useStreamerMode();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const data = useMemo(() => {
    const weekdayStats = WEEKDAYS.map((weekday) => {
      const dayTrades = trades.filter(
        (trade) => getTradeDate(trade)?.getDay() === weekday.dayIndex
      );
      const wins = dayTrades.filter((trade) => netPnl(trade) > 0).length;

      return {
        ...weekday,
        trades: dayTrades.length,
        totalPnl: dayTrades.reduce(
          (sum, trade) => sum + netPnl(trade),
          0
        ),
        winRate: dayTrades.length ? (wins / dayTrades.length) * 100 : 0,
      };
    });

    const setupMap = new Map<
      string,
      { trades: Trade[]; wins: number; totalPnl: number }
    >();

    trades.forEach((trade) => {
      const setup = getSetupName(trade);
      const current = setupMap.get(setup) ?? {
        trades: [],
        wins: 0,
        totalPnl: 0,
      };
      current.trades.push(trade);
      current.totalPnl += netPnl(trade);
      if (netPnl(trade) > 0) current.wins += 1;
      setupMap.set(setup, current);
    });

    const setupStats: SetupStats[] = Array.from(setupMap.entries())
      .map(([setup, stats]) => {
        const winningValues = stats.trades
          .map(netPnl)
          .filter((value) => value > 0);
        const losingValues = stats.trades
          .map(netPnl)
          .filter((value) => value < 0);

        return {
          setup,
          trades: stats.trades.length,
          wins: stats.wins,
          winRate: (stats.wins / stats.trades.length) * 100,
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
      const directionTrades = trades.filter(
        (trade) => trade.direction === direction
      );
      const winningDirectionTrades = directionTrades.filter(
        (trade) => netPnl(trade) > 0
      ).length;

      return {
        direction: direction === 'long' ? 'Long' : 'Short',
        trades: directionTrades.length,
        winRate: directionTrades.length
          ? (winningDirectionTrades / directionTrades.length) * 100
          : 0,
        totalPnl: directionTrades.reduce(
          (sum, trade) => sum + netPnl(trade),
          0
        ),
        fill: direction === 'long' ? '#00f0a8' : '#ff4d70',
      };
    });

    const tradeLog = [...trades].sort((a, b) => {
      const aTime = getTradeDate(a)?.getTime() ?? 0;
      const bTime = getTradeDate(b)?.getTime() ?? 0;
      return aTime - bTime;
    });

    const dailyPnl = new Map<string, number>();
    trades.forEach((trade) => {
      const day = trade.exitDate.split('T')[0];
      dailyPnl.set(day, (dailyPnl.get(day) ?? 0) + netPnl(trade));
    });
    const dayValues = Array.from(dailyPnl.values());
    const positiveDays = dayValues.filter((value) => value > 0).length;
    const winningTrades = trades.filter((trade) => netPnl(trade) > 0);
    const losingTrades = trades.filter((trade) => netPnl(trade) < 0);
    const grossWins = winningTrades.reduce(
      (sum, trade) => sum + netPnl(trade),
      0
    );
    const grossLosses = Math.abs(
      losingTrades.reduce((sum, trade) => sum + netPnl(trade), 0)
    );
    const profitFactor =
      grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 2 : 0;
    const tradesWithoutMistakes = trades.filter(
      (trade) => (trade.mistakes ?? []).length === 0
    ).length;
    const bestSetup = setupStats.reduce<SetupStats | null>(
      (best, setup) =>
        !best ||
        setup.winRate > best.winRate ||
        (setup.winRate === best.winRate && setup.trades > best.trades)
          ? setup
          : best,
      null
    );
    const journalCompleteness =
      trades.length > 0
        ? trades.reduce((score, trade) => {
            const notesScore = trade.notes?.trim() ? 0.5 : 0;
            const setupScore = trade.strategy?.trim() ? 0.35 : 0;
            const reviewScore =
              (trade.mistakes ?? []).length > 0 ||
              (trade.screenshots ?? []).length > 0
                ? 0.15
                : 0;
            return score + notesScore + setupScore + reviewScore;
          }, 0) / trades.length
        : 0;
    const radarData = [
      {
        metric: 'Winrate',
        value: trades.length
          ? (winningTrades.length / trades.length) * 100
          : 0,
      },
      {
        metric: 'Disciplina',
        value: trades.length
          ? (tradesWithoutMistakes / trades.length) * 100
          : 0,
      },
      {
        metric: 'Consistenza',
        value: dayValues.length ? (positiveDays / dayValues.length) * 100 : 0,
      },
      {
        metric: 'Setup edge',
        value: bestSetup
          ? Math.min(
              100,
              bestSetup.winRate *
                Math.min(1, 0.45 + bestSetup.trades / 10)
            )
          : 0,
      },
      {
        metric: 'Gestione rischio',
        value: Math.min(100, Math.max(0, (profitFactor / 2) * 100)),
      },
      {
        metric: 'Qualità journal',
        value: journalCompleteness * 100,
      },
    ].map((item) => ({ ...item, value: Math.round(item.value) }));

    return {
      weekdayStats,
      setupStats,
      setupChartData: setupStats.map((setup) => ({
        name: setup.setup,
        value: setup.trades,
        percentage:
          trades.length > 0 ? (setup.trades / trades.length) * 100 : 0,
      })),
      directionStats,
      tradeLog,
      radarData,
    };
  }, [trades]);

  const maxDirectionTrades = Math.max(
    ...data.directionStats.map((item) => item.trades),
    1
  );

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Performance per giorno della settimana
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {data.weekdayStats.map((day) => (
            <div
              key={day.short}
              className="rounded-[14px] border border-border bg-background/35 p-3"
            >
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {day.short}
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
                <div className="h-64 min-w-0 overflow-visible [&_.recharts-wrapper]:overflow-visible">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
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
                      >
                        {data.setupChartData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={SETUP_COLORS[index % SETUP_COLORS.length]}
                            className="cursor-pointer transition-all duration-200 hover:brightness-125 hover:[filter:drop-shadow(0_0_7px_rgba(45,212,191,0.45))]"
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
                      className="flex items-center justify-between gap-3 font-mono text-xs"
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

            {trades.length === 0 ? (
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
                      <Bar dataKey="trades" radius={[7, 7, 0, 0]}>
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
                      className="rounded-xl border border-border bg-background/35 p-3"
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

      <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.22)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Trading Radar
            </h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Profilo normalizzato della qualità operativa e del journal.
            </p>
          </div>
          {trades.length < 10 && (
            <span className="rounded-full border border-teal-400/20 bg-teal-400/10 px-2.5 py-1 font-mono text-[10px] text-teal-200">
              Dati ancora limitati
            </span>
          )}
        </div>

        {trades.length === 0 ? (
          <div className="mt-4">
            <EmptyState>Nessun trade disponibile.</EmptyState>
          </div>
        ) : (
          <div className="relative mt-2 h-[340px] w-full overflow-hidden rounded-xl bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.10),transparent_60%)] sm:h-[390px]">
            <div className="pointer-events-none absolute inset-x-[25%] top-[28%] h-1/2 rounded-full bg-profit/5 blur-3xl" />
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={data.radarData}
                outerRadius="68%"
                margin={{ top: 26, right: 42, bottom: 26, left: 42 }}
              >
                <defs>
                  <linearGradient
                    id="tradingRadarFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#5eead4" stopOpacity={0.46} />
                    <stop offset="100%" stopColor="#00f0a8" stopOpacity={0.08} />
                  </linearGradient>
                  <filter id="tradingRadarGlow">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <PolarGrid
                  stroke="rgba(94,234,212,0.18)"
                  radialLines
                />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: '#a7b0b8', fontSize: 10 }}
                  tickLine={false}
                />
                <Radar
                  dataKey="value"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  fill="url(#tradingRadarFill)"
                  fillOpacity={1}
                  dot={{ r: 3, fill: '#00f0a8', strokeWidth: 0 }}
                  style={{ filter: 'url(#tradingRadarGlow)' }}
                  isAnimationActive
                  animationDuration={650}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: '#171923',
                    border: '1px solid rgba(94,234,212,0.22)',
                    borderRadius: 10,
                    fontSize: 11,
                  }}
                  formatter={(value) => [`${value}/100`, 'Punteggio']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] font-mono text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Setup</th>
                  <th className="px-4 py-3 font-medium">Trades</th>
                  <th className="px-4 py-3 font-medium">Winrate</th>
                  <th className="px-4 py-3 font-medium">Vincita media</th>
                  <th className="px-4 py-3 font-medium">Perdita media</th>
                  <th className="px-4 py-3 font-medium">P&amp;L totale</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Trade log
          </h2>
        </div>

        {data.tradeLog.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState>Nessuna operazione da mostrare.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {data.tradeLog.map((trade) => {
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
                          onClick={() => setSelectedTrade(trade)}
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
        )}
      </div>

      <TradeDetailDialog
        trade={selectedTrade}
        streamerMode={streamerMode}
        onClose={() => setSelectedTrade(null)}
      />
    </section>
  );
}

function TradeDetailDialog({
  trade,
  streamerMode,
  onClose,
}: {
  trade: Trade | null;
  streamerMode: boolean;
  onClose: () => void;
}) {
  if (!trade) return null;

  const date = getTradeDate(trade);
  const screenshots = normalizeScreenshots(trade);
  const mistakes = trade.mistakes ?? [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] w-[94vw] max-w-4xl gap-0 overflow-hidden border-border bg-card p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="font-mono text-base font-semibold tracking-wide">
              Dettaglio trade
            </DialogTitle>
            {trade.isFavorite && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 font-mono text-[10px] text-amber-300">
                <Star className="size-3 fill-current" />
                Preferito
              </span>
            )}
          </div>
          <DialogDescription className="font-mono text-xs">
            Tutti i dati registrati per l’operazione selezionata.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <DetailCard label="Data">
              {date
                ? date.toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : '—'}
            </DetailCard>
            <DetailCard label="P&L">
              <EconomicValue
                value={netPnl(trade)}
                streamerMode={streamerMode}
                className="font-semibold"
              />
            </DetailCard>
            <DetailCard label="Direzione">
              <span className="capitalize">{trade.direction || '—'}</span>
            </DetailCard>
            <DetailCard label="Setup">
              {trade.strategy?.trim() || '—'}
            </DetailCard>
            <DetailCard label="Orario">{getTradeTime(trade)}</DetailCard>
            <DetailCard label="Asset">
              {trade.pair?.trim() || '—'}
            </DetailCard>
          </div>

          <DetailCard label="Note complete" className="mt-3">
            <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
              {trade.notes?.trim() || '—'}
            </p>
          </DetailCard>

          <DetailCard label="Errori" className="mt-3">
            {mistakes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {mistakes.map((mistake) => (
                  <span
                    key={mistake}
                    className="rounded-md border border-loss/30 bg-loss/10 px-2.5 py-1.5 font-mono text-xs text-loss"
                  >
                    {getMistakeLabel(mistake)}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </DetailCard>

          <DetailCard
            label="Link TradingView / Google Drive / immagini"
            className="mt-3"
          >
            {screenshots.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {screenshots.map((screenshot, index) => (
                  <AttachmentItem
                    key={`${screenshot.url}-${index}`}
                    screenshot={screenshot}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </DetailCard>
        </div>

        <DialogFooter className="border-t border-border px-5 py-4 sm:px-6">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="rounded-[10px]">
              Chiudi
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
