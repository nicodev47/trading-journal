'use client';

import { CalendarDays } from 'lucide-react';

interface WeeklyPlanCellProps {
  hasData: boolean;
  approach?: 'intraday' | 'swing' | '';
  onClick: () => void;
}

export function WeeklyPlanCell({ hasData, approach, onClick }: WeeklyPlanCellProps) {
  return (
    <button
      onClick={onClick}
      className="flex h-24 w-full flex-col items-center justify-center gap-1 border-b border-r border-border bg-muted/20 transition-colors hover:bg-muted/40"
    >
      <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Plan
      </span>
      {hasData ? (
        <div className="flex flex-col items-center gap-1">
          <CalendarDays className="size-4 text-profit" />
          {approach && (
            <span className="font-mono text-[9px] capitalize text-profit">
              {approach}
            </span>
          )}
        </div>
      ) : (
        <CalendarDays className="size-4 text-muted-foreground/50" />
      )}
    </button>
  );
}
