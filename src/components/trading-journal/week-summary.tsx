'use client';

import { cn } from '@/lib/utils';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

interface WeekSummaryProps {
  totalPnl: number;
  tradeCount: number;
}

export function WeekSummary({ totalPnl, tradeCount }: WeekSummaryProps) {
  const { streamerMode } = useStreamerMode();
  const fullPnl = `${totalPnl.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  const compactPnl = (() => {
    const abs = Math.abs(totalPnl);
    const sign = totalPnl < 0 ? '-' : '';
    if (abs >= 1000000) return `${sign}${(abs / 1000000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}M`;
    if (abs >= 1000) return `${sign}${(abs / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k`;
    return `${totalPnl.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;
  })();

  return (
    <div className="flex h-[66px] w-full min-w-0 flex-col items-end justify-center gap-1 bg-background p-1.5 sm:h-[82px] sm:p-2 md:h-[100px] md:gap-1.5 md:p-3">
      <div className="flex items-center gap-1">
        <span className="font-mono text-[8px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[10px] md:text-xs">
          SETT
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span
          className={cn(
            'font-mono text-[9px] font-semibold leading-tight sm:text-[11px] md:text-base',
            totalPnl > 0 && 'text-profit',
            totalPnl < 0 && 'text-loss',
            totalPnl === 0 && 'text-muted-foreground'
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
        <span className="font-mono text-[9px] text-muted-foreground sm:text-[10px] md:text-sm">
          {tradeCount}
        </span>
      </div>
    </div>
  );
}
