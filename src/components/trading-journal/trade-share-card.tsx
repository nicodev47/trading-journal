import { Moon } from 'lucide-react';
import {
  CUSTOM_TAG_PREFIX,
  TRADE_TAGS,
  type Trade,
} from '@/lib/types/trade';
import { cn } from '@/lib/utils';

interface TradeShareCardProps {
  trade: Trade;
  date: string;
  handle: string;
  streamerMode: boolean;
  className?: string;
}

const getTradeDate = (trade: Trade, fallbackDate: string) => {
  const rawDate = trade.exitDate || trade.entryDate || fallbackDate;
  const datePart = rawDate.split('T')[0] || fallbackDate;
  const [year, month, day] = datePart.split('-').map(Number);

  if (year && month && day) {
    return new Date(year, month - 1, day);
  }

  return new Date(fallbackDate);
};

const formatTradeDate = (trade: Trade, fallbackDate: string) => {
  const tradeDate = getTradeDate(trade, fallbackDate);

  return tradeDate.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatPnl = (pnl: number, streamerMode: boolean) => {
  if (streamerMode) {
    return '****** USD';
  }

  const sign = pnl > 0 ? '+' : pnl < 0 ? '-' : '';
  const absoluteValue = Math.abs(pnl).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${sign}${absoluteValue} USD`;
};

const getTradeTime = (trade: Trade) => {
  return (trade.exitDate?.split('T')[1] || trade.entryDate?.split('T')[1] || '')
    .slice(0, 5) || '--:--';
};

const getDisplayHandle = (handle: string) => {
  const normalizedHandle = handle.trim().replace(/^@+/, '');

  return normalizedHandle ? `@${normalizedHandle}` : null;
};

const getTagLabel = (tag: string) => {
  const defaultTag = TRADE_TAGS.find(item => item.value === tag);

  if (defaultTag) {
    return defaultTag.label;
  }

  if (tag.startsWith(CUSTOM_TAG_PREFIX)) {
    return tag.slice(CUSTOM_TAG_PREFIX.length);
  }

  return tag;
};

const formatShareCardSetup = (setup?: string | null) => {
  if (setup === 'Continuation') return 'Continuation';
  if (setup === 'Reversal Sequence') return 'Reversal Seq.';
  if (setup === 'Reversal Sequence Failed') return 'Rev. Seq. Failed';

  return '—';
};

function ShareMetric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="flex min-h-[82px] flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/38">
        {label}
      </div>
      <div
        className={cn(
          'mt-2 overflow-hidden text-ellipsis whitespace-nowrap font-bold leading-none text-white',
          compact
            ? 'text-[clamp(16px,1.7vw,22px)]'
            : 'text-[clamp(18px,2vw,24px)]'
        )}
      >
        {value || '--'}
      </div>
    </div>
  );
}

export function TradeShareCard({
  trade,
  date,
  handle,
  streamerMode,
  className,
}: TradeShareCardProps) {
  const netPnl = trade.pnl - (trade.commission || 0);
  const isProfit = netPnl > 0;
  const isLoss = netPnl < 0;
  const accent = isProfit ? '#00d68f' : isLoss ? '#ff4d70' : '#d6d9e0';
  const badgeLabel = isProfit ? 'PROFIT' : isLoss ? 'LOSS' : 'BREAKEVEN';
  const visibleTags = trade.tags.slice(0, 2).map(getTagLabel);
  const displayHandle = getDisplayHandle(handle);

  return (
    <div
      className={cn(
        'relative aspect-[16/9] w-[960px] max-w-full overflow-hidden rounded-[28px] border p-9 text-white shadow-2xl',
        className
      )}
      style={{
        background:
          'radial-gradient(circle at 18% 14%, rgba(0, 214, 143, 0.18), transparent 32%), radial-gradient(circle at 88% 6%, rgba(135, 92, 255, 0.18), transparent 28%), linear-gradient(135deg, #05080c 0%, #081019 45%, #05070b 100%)',
        borderColor: isProfit
          ? 'rgba(0, 214, 143, 0.42)'
          : isLoss
            ? 'rgba(255, 77, 112, 0.42)'
            : 'rgba(255, 255, 255, 0.16)',
        boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 30px 90px ${
          isProfit
            ? 'rgba(0, 214, 143, 0.16)'
            : isLoss
              ? 'rgba(255, 77, 112, 0.16)'
              : 'rgba(0, 0, 0, 0.35)'
        }`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full blur-3xl"
        style={{ backgroundColor: accent, opacity: 0.2 }}
      />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="flex size-12 items-center justify-center rounded-2xl border"
              style={{
                borderColor: `${accent}66`,
                backgroundColor: `${accent}1c`,
                color: accent,
              }}
            >
              <Moon className="size-7" />
            </div>
            <div>
              <div className="text-[clamp(38px,3.4vw,48px)] font-black tracking-tight text-white">
                Trade Recap
              </div>
              <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.28em] text-white/42">
                Trading performance card
              </div>
            </div>
          </div>

          <div className="text-right">
            <div
              className="inline-flex rounded-full border px-4 py-2 text-[12px] font-black uppercase tracking-[0.2em]"
              style={{
                borderColor: `${accent}66`,
                backgroundColor: `${accent}18`,
                color: accent,
              }}
            >
              {badgeLabel}
            </div>
            <div className="mt-4 text-[17px] font-semibold capitalize text-white/55">
              {formatTradeDate(trade, date)}
            </div>
          </div>
        </header>

        <main className="grid flex-1 grid-cols-[1fr_0.95fr] items-center gap-11">
          <section>
            <div className="text-[12px] font-semibold uppercase tracking-[0.3em] text-white/42">
              NET P&amp;L
            </div>
            <div
              className="mt-4 whitespace-nowrap text-[clamp(44px,4.8vw,66px)] font-black leading-none tracking-tight"
              style={{ color: accent }}
            >
              {formatPnl(netPnl, streamerMode)}
            </div>
            {visibleTags.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {visibleTags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-[13px] font-semibold text-white/68"
                >
                  {tag}
                </span>
              ))}
            </div>
            )}
          </section>

          <section className="grid grid-cols-[0.9fr_1.15fr] gap-4">
            <ShareMetric label="Direzione" value={trade.direction === 'short' ? 'Short' : 'Long'} />
            <ShareMetric label="Asset" value={trade.pair || '--'} />
            <ShareMetric label="Orario" value={getTradeTime(trade)} />
            <ShareMetric
              label="Setup"
              value={formatShareCardSetup(trade.strategy)}
              compact
            />
          </section>
        </main>

        <footer className="flex items-end justify-between border-t border-white/10 pt-6">
          {displayHandle && (
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.26em] text-white/36">
                Shared by
              </div>
              <div className="mt-1 text-[28px] font-black text-white">
                {displayHandle}
              </div>
            </div>
          )}
          <div className="ml-auto text-right">
            <div className="text-[12px] font-semibold uppercase tracking-[0.26em] text-white/36">
              POWERED BY
            </div>
            <div className="mt-1 text-[20px] font-black" style={{ color: accent }}>
              EclipseJournal
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
