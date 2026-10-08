import type { ReactNode } from 'react';
import { BadgeCheck, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SHARE_CARD_WIDTH = 760;
export const SHARE_CARD_HEIGHT = 950;

const getAmountFontSize = (amount: string) =>
  amount.length <= 8 ? 120 : amount.length <= 10 ? 100 : amount.length <= 12 ? 82 : 64;

export function ShareCardFrame({
  className,
  glow,
  children,
}: {
  className?: string;
  glow: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative aspect-[4/5] w-[760px] max-w-full overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0b] p-14 text-white',
        className
      )}
      style={{
        background: `radial-gradient(circle at 20% 32%, ${glow}, transparent 36%), #0a0a0b`,
      }}
    >
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  );
}

export function ShareCardHeader({ dateLabel }: { dateLabel: string }) {
  return (
    <header className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-white/10">
          <Moon className="size-6 text-white" />
        </div>
        <div className="text-[28px] font-semibold tracking-tight text-white">
          EclipseJournal
        </div>
      </div>
      <div className="flex items-center gap-2 text-[17px] font-medium text-white/60">
        <BadgeCheck className="size-5 text-white/60" />
        <span className="capitalize">{dateLabel}</span>
      </div>
    </header>
  );
}

export function ShareGlowAmount({
  sign,
  amount,
  currency,
  label,
  accent,
  trend,
}: {
  sign: string;
  amount: string;
  currency: string;
  label: string;
  accent: string;
  trend: 'up' | 'down' | 'flat';
}) {
  return (
    <section className="mt-20">
      <div className="flex items-end gap-4" style={{ color: accent }}>
        <div
          className="whitespace-nowrap font-semibold leading-none tracking-[-0.04em]"
          style={{
            fontSize: getAmountFontSize(`${sign}${amount}`),
            textShadow: `0 0 40px ${accent}40`,
          }}
        >
          {sign}
          {amount}
        </div>
        <div className="flex items-center gap-3 pb-2">
          <span className="text-[32px] font-medium leading-none text-white/50">
            {currency}
          </span>
          {trend !== 'flat' && (
            <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden="true">
              <polygon
                points={trend === 'up' ? '13,2 24,20 2,20' : '13,20 24,2 2,2'}
                fill={accent}
              />
            </svg>
          )}
        </div>
      </div>
      <div className="mt-4 text-[22px] font-medium text-white/50">{label}</div>
    </section>
  );
}

export function ShareCaption({ lines }: { lines: string[] }) {
  return (
    <div className="mt-auto space-y-1.5 text-[18px] font-medium text-white/45">
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}

export function ShareRow({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'profit' | 'loss' | 'neutral';
}) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5">
      <div className="text-[20px] font-medium text-white/60">
        {label}
      </div>
      <div
        className={cn(
          'whitespace-nowrap text-[26px] font-semibold tabular-nums',
          tone === 'profit'
            ? 'text-[#34d27b]'
            : tone === 'loss'
              ? 'text-[#ff6568]'
              : 'text-white'
        )}
      >
        {value || '--'}
      </div>
    </div>
  );
}

export function ShareCardFooter({
  avatar,
  name,
  caption,
  right,
}: {
  avatar: ReactNode;
  name: string;
  caption: string;
  right: string;
}) {
  return (
    <footer className="mt-8 flex items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-white/10 text-[24px] font-semibold text-white">
          {avatar}
        </div>
        <div>
          <div className="text-[22px] font-semibold text-white">{name}</div>
          <div className="mt-0.5 text-[15px] font-medium text-white/45">
            {caption}
          </div>
        </div>
      </div>
      <div className="text-[20px] font-semibold text-white/70">{right}</div>
    </footer>
  );
}
