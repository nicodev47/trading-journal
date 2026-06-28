'use client';

import { cn } from '@/lib/utils';
import type { DayData } from '@/lib/types/trade';
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
  const { streamerMode } = useStreamerMode();
  const hasTrades = dayData && dayData.tradeCount > 0;
  const pnl = dayData?.totalPnl ?? 0;
  const tradeCount = dayData?.tradeCount ?? 0;
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

    return {};
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

  return (
    <button
      onClick={onClick}
      data-tutorial={tutorialTarget}
      className={cn(
        'group relative flex h-[56px] w-full min-w-0 flex-col bg-background p-1 text-left transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-profit/80 min-[380px]:h-[62px] min-[380px]:p-1.5 sm:h-[82px] sm:p-2 md:h-[100px] md:p-2.5',
        !isCurrentMonth &&
          '!bg-background text-muted-foreground/20 hover:!bg-background',
        isToday && 'ring-1 ring-inset ring-profit/80'
      )}
      style={getBackgroundStyle()}
    >
      <div className="flex w-full min-w-0 flex-col gap-1.5 sm:gap-2">
        <span
          className={cn(
            'font-sans text-[12px] font-bold leading-none tracking-[-0.04em] min-[380px]:text-[13px] sm:text-[15px] md:text-[17px]',
            isToday && 'text-profit',
            !isCurrentMonth && 'text-muted-foreground/20',
            isCurrentMonth && !isToday && 'text-foreground'
          )}
        >
          {date.getDate()}
        </span>

        {hasTrades && (
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
        )}
      </div>

      {hasTrades && (
        <span className="absolute bottom-1 left-1 font-mono text-[8px] text-muted-foreground min-[380px]:bottom-1.5 min-[380px]:left-1.5 min-[380px]:text-[9px] sm:bottom-2 sm:left-2 sm:text-[10px] md:bottom-2.5 md:left-2.5 md:text-xs">
          {tradeCount}
        </span>
      )}

      {hasFavoriteTrade && (
        <span
          aria-label="Trade preferito"
          className={cn(
            'pointer-events-none absolute right-1 top-1 text-[13px] leading-none min-[380px]:right-1.5 min-[380px]:top-1.5 min-[380px]:text-[16px] sm:right-2 sm:top-2 sm:text-[18px]',
            !isCurrentMonth && 'opacity-30'
          )}
        >
          ⭐️
        </span>
      )}
    </button>
  );
}
