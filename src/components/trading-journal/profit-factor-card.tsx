'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  formatRiskRewardRatio,
  type RiskRewardRatioResult,
} from '@/lib/calculations';
import { cn } from '@/lib/utils';

export interface RiskRewardCardPresentation {
  value: string;
  description: string;
  progress: number;
  tone: 'profit' | 'loss' | 'empty';
}

export function getRiskRewardCardPresentation(
  result: RiskRewardRatioResult
): RiskRewardCardPresentation {
  return {
    value: formatRiskRewardRatio(result.value),
    description: 'Rapporto Rischio / Rendimento',
    progress: result.value === null
      ? 0
      : Math.min((result.value / 3) * 100, 100),
    tone:
      result.value === null
        ? 'empty'
        : result.value >= 1
          ? 'profit'
          : 'loss',
  };
}

interface RiskRewardCardProps extends RiskRewardCardPresentation {
  surface?: 'calendar' | 'analysis';
}

export function RiskRewardCard({
  value,
  description,
  progress,
  tone,
  surface = 'calendar',
}: RiskRewardCardProps) {
  const isAnalysis = surface === 'analysis';

  return (
    <Card
      className={cn(
        'max-w-full rounded-2xl border border-border bg-card/95 shadow-[0_10px_24px_rgba(0,0,0,0.18)]',
        isAnalysis && 'self-start py-0'
      )}
    >
      <CardContent
        className={cn(
          'flex min-w-0 flex-col justify-between gap-2',
          isAnalysis
            ? 'min-h-[104px] p-3.5 md:min-h-[124px] md:p-4'
            : 'min-h-[68px] p-3 md:min-h-[72px] md:p-3.5'
        )}
      >
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:tracking-[0.18em]">
          Risk-to-Reward Ratio
        </span>

        <div className="grid min-w-0 grid-cols-[minmax(3.25rem,1fr)_minmax(8rem,10rem)] items-center gap-3 md:grid-cols-[minmax(3.25rem,1fr)_10rem]">
          <span className="min-w-0 font-mono text-lg font-semibold tracking-tight text-foreground md:text-xl">
            {value}
          </span>

          <Progress
            value={progress}
            className="h-1.5 w-full rounded-full bg-secondary"
            indicatorClassName={cn(
              tone === 'profit' && 'bg-profit',
              tone === 'loss' && 'bg-loss',
              tone === 'empty' && 'bg-transparent'
            )}
          />
        </div>

        <span className="font-mono text-[11px] text-muted-foreground">
          {description}
        </span>
      </CardContent>
    </Card>
  );
}
