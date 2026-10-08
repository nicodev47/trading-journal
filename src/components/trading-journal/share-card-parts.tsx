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
        'relative aspect-[4/5] w-[760px] max-w-full overflow-hidden rounded-[32px] border border-white/10 p-14 text-white',
        className
      )}
      style={{
        background: `radial-gradient(circle at 85% 4%, rgba(111,99,240,0.22), transparent 38%), radial-gradient(circle at 18% 34%, ${glow}, transparent 34%), linear-gradient(165deg, #0b0b18 0%, #120f26 55%, #0a0a14 100%)`,
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
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10">
          <Moon className="size-6 text-white" />
        </div>
        <div className="text-[30px] font-bold tracking-tight text-white">
          EclipseJournal
        </div>
      </div>
      <div className="flex items-center gap-2 text-[16px] font-semibold text-white/85">
        <BadgeCheck className="size-5 text-[#34d27b]" />
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
          className="whitespace-nowrap font-black leading-none tracking-[-0.04em]"
          style={{
            fontSize: getAmountFontSize(`${sign}${amount}`),
            textShadow: `0 0 36px ${accent}66`,
          }}
        >
          {sign}
          {amount}
        </div>
        <div className="flex items-center gap-3 pb-2">
          <span className="text-[34px] font-bold leading-none text-white/70">
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
      <div className="mt-4 text-[22px] font-semibold text-white/55">{label}</div>
    </section>
  );
}

export function ShareCaption({ lines }: { lines: string[] }) {
  return (
    <div className="mt-auto space-y-1.5 text-[15px] font-semibold uppercase tracking-[0.12em] text-white/45">
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
    <div className="flex items-center justify-between gap-6 rounded-2xl bg-white/[0.06] px-6 py-5">
      <div className="text-[19px] font-bold uppercase tracking-wide text-white">
        {label}
      </div>
      <div
        className={cn(
          'whitespace-nowrap text-[24px] font-bold tabular-nums',
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
        <div className="flex size-16 items-center justify-center rounded-full bg-[#6f63f0] text-[24px] font-bold text-white">
          {avatar}
        </div>
        <div>
          <div className="text-[22px] font-bold text-white">{name}</div>
          <div className="mt-0.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/45">
            {caption}
          </div>
        </div>
      </div>
      <div className="text-[20px] font-bold text-white">{right}</div>
    </footer>
  );
}
