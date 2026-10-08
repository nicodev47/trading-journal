import type { Trade } from '@/lib/types/trade';
import { getTradeSharePresentation } from '@/lib/trade-share-outcome';
import {
  ShareCardFooter,
  ShareCardFrame,
  ShareCardHeader,
  ShareCaption,
  ShareGlowAmount,
  ShareRow,
} from './share-card-parts';

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

const splitPnl = (pnl: number, streamerMode: boolean) => {
  if (streamerMode) {
    return { sign: '', amount: '******' };
  }

  const sign = pnl > 0 ? '+' : pnl < 0 ? '-' : '';
  const amount = Math.abs(pnl).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return { sign, amount };
};

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

export function TradeShareCard({
  trade,
  date,
  handle,
  streamerMode,
  className,
}: TradeShareCardProps) {
  const netPnl = trade.pnl - (trade.commission || 0);
  const { accent, badgeLabel } = getTradeSharePresentation(netPnl);
  const displayHandle = getDisplayHandle(handle);
  const directionLabel = trade.direction === 'short' ? 'Short' : 'Long';
  const { sign, amount } = splitPnl(netPnl, streamerMode);
  const avatar = displayHandle
    ? displayHandle.slice(1, 3).toUpperCase()
    : 'EJ';

  return (
    <ShareCardFrame className={className} glow={`${accent}2e`}>
      <ShareCardHeader dateLabel={formatTradeDate(trade, date)} />

      <ShareGlowAmount
        sign={sign}
        amount={amount}
        currency="USD"
        label="Net P&L"
        accent={accent}
        trend={netPnl > 0 ? 'up' : netPnl < 0 ? 'down' : 'flat'}
      />

      <ShareCaption lines={[`${trade.pair || '--'} · ${directionLabel}`]} />

      <div className="mt-5 space-y-3">
        <ShareRow label="Asset" value={trade.pair || '--'} />
        <ShareRow label="Direzione" value={directionLabel} />
        <ShareRow label="Orario" value={getTradeTime(trade)} />
        <ShareRow label="Setup" value={formatShareCardSetup(trade.strategy)} />
      </div>

      <ShareCardFooter
        avatar={avatar}
        name={displayHandle ?? 'EclipseJournal'}
        caption="Trading journal"
        right={badgeLabel}
      />
    </ShareCardFrame>
  );
}
