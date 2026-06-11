'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface StatsCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  progress?: number;
  valueColor?: 'profit' | 'loss' | 'neutral' | 'default';
  showProgress?: boolean;
  showNoTradesIndicator?: boolean;
}

export function StatsCard({
  title,
  value,
  subtitle,
  progress = 0,
  valueColor = 'default',
  showProgress = false,
  showNoTradesIndicator = false,
}: StatsCardProps) {
  return (
    <Card className="rounded-2xl border border-border bg-card/95 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
      <CardContent className="flex min-h-[72px] flex-col justify-between gap-2 p-3.5">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </span>

        <div className="flex flex-1 items-center gap-3">
          {showNoTradesIndicator && (
            <div className="flex size-8 items-center justify-center rounded-full border-2 border-muted-foreground/50">
              <span className="font-mono text-base text-muted-foreground">-</span>
            </div>
          )}

          <div className="flex flex-col justify-center gap-0.5">
            <span
              className={cn(
                'font-mono text-xl font-semibold tracking-tight',
                valueColor === 'profit' && 'text-profit',
                valueColor === 'loss' && 'text-loss',
                valueColor === 'neutral' && 'text-muted-foreground',
                valueColor === 'default' && 'text-foreground'
              )}
            >
              {value}
            </span>

            {subtitle && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {showProgress && (
          <Progress
            value={progress}
            className="h-1 rounded-full bg-secondary"
          />
        )}
      </CardContent>
    </Card>
  );
}