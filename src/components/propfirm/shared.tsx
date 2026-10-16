'use client';

import { useStreamerMode } from '@/contexts/streamer-mode-context';
import type { AccountKind } from '@/lib/propfirm/types';
import type { AccountStatus, FailReason } from '@/lib/propfirm/engine';
import { cn } from '@/lib/utils';

export const KIND_LABEL: Record<AccountKind, string> = {
  evaluation: 'Valutazione',
  funded: 'Funded',
  live: 'Live',
};

export const STATUS_LABEL: Record<AccountStatus, string> = {
  active: 'Attivo',
  passed: 'Superato',
  failed: 'Fallito',
};

export const FAIL_LABEL: Record<FailReason, string> = {
  drawdown: 'drawdown massimo violato',
  'daily-loss': 'limite di perdita giornaliero violato',
};

export function formatUsd(value: number) {
  const whole = Number.isInteger(value);

  return `${value.toLocaleString('it-IT', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: 'always' as unknown as boolean,
  })} USD`;
}

export function formatSigned(value: number) {
  return `${value > 0 ? '+' : ''}${formatUsd(value)}`;
}

export function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);

  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const todayKey = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/** The day after a YYYY-MM-DD date. */
export function nextDay(date: string) {
  const parsed = new Date(`${date}T12:00:00`);

  parsed.setDate(parsed.getDate() + 1);

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}

/** Formatter that hides amounts in streamer mode. */
export function useMoney() {
  const { streamerMode } = useStreamerMode();

  return {
    usd: (value: number) => (streamerMode ? '******' : formatUsd(value)),
    signed: (value: number) => (streamerMode ? '******' : formatSigned(value)),
  };
}

export function StatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium',
        status === 'active' && 'border-border bg-white/[0.06] text-muted-foreground',
        status === 'passed' && 'border-profit/40 bg-profit/10 text-profit',
        status === 'failed' && 'border-loss/40 bg-loss/10 text-loss'
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ProgressBar({
  value,
  tone = 'neutral',
}: {
  /** 0–100 */
  value: number;
  tone?: 'neutral' | 'profit' | 'loss';
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn(
          'h-full rounded-full transition-all',
          tone === 'profit' && 'bg-profit',
          tone === 'loss' && 'bg-loss',
          tone === 'neutral' && 'bg-white/80'
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function FirmTile({
  initials,
  tile,
  className,
}: {
  initials: string;
  tile: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl border bg-gradient-to-b font-sans text-sm font-bold tracking-tight text-white',
        tile,
        className
      )}
    >
      {initials}
    </span>
  );
}
