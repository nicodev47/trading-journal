'use client';

import { type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import {
  CUSTOM_TAG_PREFIX,
  TRADE_TAGS,
  type DayData,
  type Trade,
} from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

interface CalendarDayProps {
  date: Date;
  dayData: DayData | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  tutorialTarget?: string;
  maxPnl: number;
  minPnl: number;
  onClick: () => void;
}

const SETUP_LABELS: Record<string, string> = {
  Continuation: 'Cont',
  'Reversal Sequence': 'Rev.Seq',
  'Reversal Sequence Fail': 'Rev.Seq.F',
  'Reversal Sequence Failed': 'Rev.Seq.F',
};

const getCompactSetupLabel = (setup: string) =>
  SETUP_LABELS[setup] || setup;

const getTagLabel = (value: string) => {
  const standardTag = TRADE_TAGS.find((tag) => tag.value === value);

  if (standardTag) return `${standardTag.emoji} ${standardTag.label}`;
  if (value.startsWith(CUSTOM_TAG_PREFIX)) {
    return value.slice(CUSTOM_TAG_PREFIX.length);
  }

  return value;
};

const getPrimarySetup = (trades: Trade[]) => {
  const counts = new Map<string, number>();
  const firstIndex = new Map<string, number>();

  trades.forEach((trade, index) => {
    const setup = trade.strategy?.trim();

    if (!setup) return;

    counts.set(setup, (counts.get(setup) ?? 0) + 1);
    if (!firstIndex.has(setup)) firstIndex.set(setup, index);
  });

  return Array.from(counts.entries()).sort((a, b) => {
    const countDiff = b[1] - a[1];

    if (countDiff !== 0) return countDiff;

    return (firstIndex.get(a[0]) ?? 0) - (firstIndex.get(b[0]) ?? 0);
  })[0]?.[0];
};

const getUniqueTags = (trades: Trade[]) => {
  const tags: string[] = [];
  const seen = new Set<string>();

  trades.forEach((trade) => {
    (trade.tags ?? []).forEach((tag) => {
      if (seen.has(tag)) return;

      seen.add(tag);
      tags.push(tag);
    });
  });

  return tags;
};

export function CalendarDay({
  date,
  dayData,
  isCurrentMonth,
  isToday,
  tutorialTarget,
  maxPnl,
  minPnl,
  onClick,
}: CalendarDayProps) {
  const { streamerMode, showCalendarSetup, showCalendarTags } =
    useStreamerMode();
  const canShowCalendarSetup = showCalendarSetup && !streamerMode;
  const canShowCalendarTags = showCalendarTags && !streamerMode;
  const hasTrades = dayData && dayData.tradeCount > 0;
  const pnl = dayData?.totalPnl ?? 0;
  const tradeCount = dayData?.tradeCount ?? 0;
  const primarySetup = dayData ? getPrimarySetup(dayData.trades) : undefined;
  const uniqueTags = dayData ? getUniqueTags(dayData.trades) : [];
  const visibleTag = uniqueTags[0];
  const hiddenTags = uniqueTags.slice(1);
  const hiddenTagCount = Math.max(uniqueTags.length - 1, 0);
  const visibleTagTitle = visibleTag ? getTagLabel(visibleTag) : undefined;
  const hiddenTagsTitle = hiddenTags.map(getTagLabel).join(', ');
  const hasFavoriteTrade =
    dayData?.trades.some(trade => trade.isFavorite ?? false) ?? false;

  const getIntensity = () => {
    if (!hasTrades) return 0;
    if (pnl > 0 && maxPnl > 0) {
      return Math.min(pnl / maxPnl, 1);
    }
    if (pnl < 0 && minPnl < 0) {
      return Math.min(Math.abs(pnl) / Math.abs(minPnl), 1);
    }
    return 0;
  };

  const intensity = getIntensity();

  const getBackgroundStyle = () => {
    if (!hasTrades) return {};

    if (pnl > 0) {
      const alpha = 0.26 + intensity * 0.34;
      return {
        backgroundColor: `rgba(0, 214, 143, ${alpha})`,
        boxShadow: `inset 0 0 0 1px rgba(0, 214, 143, ${
          0.12 + intensity * 0.22
        })`,
      };
    }

    if (pnl < 0) {
      const alpha = 0.22 + intensity * 0.3;
      return {
        backgroundColor: `rgba(255, 77, 112, ${alpha})`,
        boxShadow: `inset 0 0 0 1px rgba(255, 77, 112, ${
          0.16 + intensity * 0.24
        })`,
      };
    }

    return {
      backgroundColor: 'rgba(148, 163, 184, 0.08)',
      boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.14)',
    };
  };

  const fullPnl = `${pnl.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;

  const compactPnl = (() => {
    const abs = Math.abs(pnl);
    const sign = pnl < 0 ? '-' : '';

    if (abs >= 1000000) {
      return `${sign}${(abs / 1000000).toLocaleString('it-IT', {
        maximumFractionDigits: 1,
      })}M`;
    }

    if (abs >= 1000) {
      return `${sign}${(abs / 1000).toLocaleString('it-IT', {
        maximumFractionDigits: 1,
      })}k`;
    }

    return `${pnl.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;
  })();

  const handleDayKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    onClick();
  };

  if (!isCurrentMonth) {
    return (
      <div
        aria-hidden="true"
        className="flex h-[78px] w-full bg-background p-1 min-[380px]:h-[84px] min-[380px]:p-1.5 sm:h-[92px] sm:p-2 md:h-[106px] md:p-2.5"
      >
        <span className="font-sans text-[12px] font-bold leading-none tracking-[-0.04em] text-muted-foreground/25 min-[380px]:text-[13px] sm:text-[15px] md:text-[17px]">
          {date.getDate()}
        </span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleDayKeyDown}
      data-tutorial={tutorialTarget}
      className={cn(
        'group relative flex h-[78px] w-full min-w-0 cursor-pointer flex-col bg-background p-1 pb-4 text-left transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-profit/80 min-[380px]:h-[84px] min-[380px]:p-1.5 min-[380px]:pb-4 sm:h-[92px] sm:p-2 sm:pb-5 md:h-[106px] md:p-2.5 md:pb-6',
        isToday && 'ring-1 ring-inset ring-profit/80'
      )}
      style={getBackgroundStyle()}
    >
      <div className="flex h-full w-full min-w-0 flex-col gap-1 sm:gap-1.5">
        <span
          className={cn(
            'font-sans text-[12px] font-bold leading-none tracking-[-0.04em] min-[380px]:text-[13px] sm:text-[15px] md:text-[17px]',
            isToday && 'text-profit',
            !isToday && 'text-foreground'
          )}
        >
          {date.getDate()}
        </span>

        {hasTrades && (
          <>
            <span
              className={cn(
                'block w-full min-w-0 truncate font-mono text-[8px] font-semibold leading-tight min-[380px]:text-[9px] sm:text-[11px] md:text-sm',
                pnl > 0 && 'text-profit',
                pnl < 0 && 'text-loss',
                pnl === 0 && 'text-muted-foreground'
              )}
            >
              {streamerMode ? (
                '******'
              ) : (
                <>
                  <span className="sm:hidden">{compactPnl}</span>
                  <span className="hidden sm:inline">{fullPnl}</span>
                </>
              )}
            </span>

            {(canShowCalendarSetup || canShowCalendarTags) && (
              <div className="flex max-h-[26px] w-full min-w-0 flex-wrap items-center gap-1 overflow-hidden sm:max-h-[30px]">
                {canShowCalendarSetup && primarySetup && (
                  <span
                    className={cn(
                      'inline-flex max-w-[46px] shrink items-center rounded-full border border-white/10 bg-background/55 px-1.5 py-[2px] font-mono text-[7px] font-semibold leading-none text-foreground/80 shadow-sm min-[380px]:max-w-[56px] min-[380px]:text-[8px] sm:max-w-[70px] sm:px-2 sm:text-[9px] md:max-w-[92px]'
                    )}
                    title={primarySetup}
                  >
                    <span className="min-w-0 truncate whitespace-nowrap">
                      {getCompactSetupLabel(primarySetup)}
                    </span>
                  </span>
                )}

                {canShowCalendarTags && visibleTag && (
                  <span
                    className={cn(
                      'inline-flex max-w-[46px] shrink items-center rounded-full border border-border/80 bg-secondary/45 px-1.5 py-[2px] font-mono text-[7px] font-semibold leading-none text-muted-foreground shadow-sm min-[380px]:max-w-[54px] min-[380px]:text-[8px] sm:max-w-[64px] sm:px-2 sm:text-[9px]'
                    )}
                    title={visibleTagTitle}
                  >
                    <span className="min-w-0 truncate whitespace-nowrap">
                      {getTagLabel(visibleTag)}
                    </span>
                  </span>
                )}
              </div>
            )}

            <span className="mt-auto" aria-hidden="true" />
          </>
        )}
      </div>

      {hasTrades && (
        <span
          className="absolute bottom-1 left-1 font-mono text-[8px] leading-none text-muted-foreground min-[380px]:bottom-1.5 min-[380px]:left-1.5 min-[380px]:text-[9px] sm:bottom-2 sm:left-2 sm:text-[10px] md:bottom-2.5 md:left-2.5 md:text-xs"
        >
          {tradeCount}
        </span>
      )}

      {canShowCalendarTags && hiddenTagCount > 0 && (
        <div
          className="group/tag-menu absolute bottom-1 right-1 z-20 min-[380px]:bottom-1.5 min-[380px]:right-1.5 sm:bottom-2 sm:right-2 md:bottom-2.5 md:right-2.5"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <span
            className={cn(
              'inline-flex items-center rounded-full border border-border/80 bg-background/65 px-1 py-[2px] font-mono text-[7px] font-semibold leading-none text-muted-foreground shadow-sm transition hover:border-border hover:bg-background/90 hover:text-foreground min-[380px]:text-[8px] sm:px-1.5 sm:text-[9px]'
            )}
            title={hiddenTagsTitle}
          >
            +{hiddenTagCount}
          </span>

          <div
            className="pointer-events-none absolute bottom-full right-0 z-50 mb-1 max-w-[min(150px,calc(100vw-2rem))] rounded-md border border-border/80 bg-background/95 px-1.5 py-1.5 text-left opacity-0 shadow-lg backdrop-blur transition group-hover/tag-menu:opacity-100"
          >
            <div className="flex max-w-full flex-col gap-0.5">
              {hiddenTags.map((tag) => (
                <span
                  key={tag}
                  className="max-w-full truncate rounded-sm border border-border/60 bg-secondary/35 px-1.5 py-0.5 font-sans text-[10px] font-medium leading-tight text-foreground"
                  title={getTagLabel(tag)}
                >
                  {getTagLabel(tag)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasFavoriteTrade && (
        <span
          aria-label="Trade preferito"
          className="pointer-events-none absolute right-1 top-1 text-[13px] leading-none min-[380px]:right-1.5 min-[380px]:top-1.5 min-[380px]:text-[16px] sm:right-2 sm:top-2 sm:text-[18px]"
        >
          ⭐️
        </span>
      )}
    </div>
  );
}
