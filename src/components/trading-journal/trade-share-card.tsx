import { Moon } from 'lucide-react';
import type { Trade } from '@/lib/types/trade';
import { getTradeSharePresentation } from '@/lib/trade-share-outcome';
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

const getPnlFontSize = (text: string) =>
  text.length <= 12 ? 96 : text.length <= 14 ? 80 : 66;

const getTradeTime = (trade: Trade) => {
  return (trade.exitDate?.split('T')[1] || trade.entryDate?.split('T')[1] || '')
    .slice(0, 5) || '--:--';
};

const getDisplayHandle = (handle: string) => {
  const normalizedHandle = handle.trim().replace(/^@+/, '');

  return normalizedHandle ? `@${normalizedHandle}` : null;
};

const formatShareCardSetup = (setup?: string | null) => {
  if (setup === 'Continuation') return 'Continuation';
  if (setup === 'Reversal Sequence') return 'Reversal Seq.';
  if (setup === 'Reversal Sequence Failed') return 'Rev. Seq. Failed';

  return '—';
};

function ShareMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[14px] font-medium text-white/45">{label}</div>
      <div className="mt-2 whitespace-nowrap text-[28px] font-semibold leading-none tracking-tight text-white">
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
  const { accent } = getTradeSharePresentation(netPnl);
  const displayHandle = getDisplayHandle(handle);
  const directionLabel = trade.direction === 'short' ? 'Short' : 'Long';

  return (
    <div
      className={cn(
        'relative aspect-[16/9] w-[960px] max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0b] p-12 text-white',
        className
      )}
    >
      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
              <Moon className="size-5 text-white" />
            </div>
            <div className="text-[22px] font-semibold tracking-tight text-white">
              EclipseJournal
            </div>
          </div>
          <div className="text-[18px] font-medium capitalize text-white/50">
            {formatTradeDate(trade, date)}
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center">
          <div className="text-[22px] font-medium text-white/55">
            {trade.pair || '--'} · {directionLabel}
          </div>
          <div
            className="mt-3 whitespace-nowrap font-semibold leading-none tracking-[-0.03em]"
            style={{ color: accent, fontSize: getPnlFontSize(formatPnl(netPnl, streamerMode)) }}
          >
            {formatPnl(netPnl, streamerMode)}
          </div>
          <div className="mt-10 flex gap-14">
            <ShareMetric label="Orario" value={getTradeTime(trade)} />
            <ShareMetric label="Setup" value={formatShareCardSetup(trade.strategy)} />
          </div>
        </main>

        {displayHandle && (
          <footer className="text-[22px] font-medium text-white/70">
            {displayHandle}
          </footer>
        )}
      </div>
    </div>
  );
}
