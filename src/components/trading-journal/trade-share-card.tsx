import type { Trade } from '@/lib/types/trade';
import { getTradeSharePresentation } from '@/lib/trade-share-outcome';
import { usePreferences } from '@/contexts/preferences-context';
import { usePropAccountList } from '@/contexts/prop-accounts-context';
import { getFirm } from '@/lib/propfirm/firms';
import { FirmMark } from '@/components/propfirm/shared';
import {
  ShareCardFooter,
  ShareCardFrame,
  ShareCardHeader,
  ShareGlowAmount,
  ShareRow,
  SHARE_TRADE_CARD_HEIGHT,
  getShareIdentity,
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

const getTradeOpenTime = (trade: Trade) => {
  return (trade.entryDate?.split('T')[1] || trade.exitDate?.split('T')[1] || '')
    .slice(0, 5) || '--:--';
};

export function TradeShareCard({
  trade,
  date,
  handle,
  streamerMode,
  className,
}: TradeShareCardProps) {
  const { preferences } = usePreferences();
  const propAccounts = usePropAccountList();
  // Companies the trade was executed on (one entry per firm).
  const firms = Array.from(
    new Set(
      (trade.propAccountIds ?? [])
        .map(id => propAccounts.find(account => account.id === id)?.firmId)
        .filter((id): id is string => Boolean(id))
    )
  )
    .map(id => getFirm(id))
    .filter((firm): firm is NonNullable<ReturnType<typeof getFirm>> => Boolean(firm));
  const firmNames = firms.map(firm => firm.name).join(' · ');
  const netPnl = trade.pnl - (trade.commission || 0);
  const { accent, badgeLabel } = getTradeSharePresentation(netPnl);
  const identity = getShareIdentity(handle);
  const directionLabel = trade.direction === 'short' ? 'Short' : 'Long';
  const { sign, amount } = splitPnl(netPnl, streamerMode);

  return (
    <ShareCardFrame className={className} glow={`${accent}26`} height={SHARE_TRADE_CARD_HEIGHT}>
      <ShareCardHeader dateLabel={formatTradeDate(trade, date)} />

      <ShareGlowAmount
        sign={sign}
        amount={amount}
        currency="USD"
        label="Net P&L"
        accent={accent}
        trend={netPnl > 0 ? 'up' : netPnl < 0 ? 'down' : 'flat'}
      />

      <div className="mt-14 space-y-3">
        <ShareRow label="Asset" value={trade.pair || '--'} />
        <ShareRow label="Direzione" value={directionLabel} />
        <ShareRow label="Orario apertura" value={getTradeOpenTime(trade)} />
      </div>

      <ShareCardFooter
        avatar={
          preferences.photo ? (
            <img src={preferences.photo} alt="" className="size-full object-cover" />
          ) : (
            identity?.initials ?? 'EJ'
          )
        }
        name={identity?.displayName ?? 'EclipseJournal'}
        caption={
          firms.length > 0 ? (
            <span className="flex min-w-0 items-center gap-3 whitespace-nowrap">
              <span>x</span>
              <span className="flex shrink-0 items-center -space-x-2.5">
                {firms.map(firm => (
                  <FirmMark key={firm.id} firm={firm} className="size-9 rounded-full" />
                ))}
              </span>
              {/* One company: its name too. More, or a long name: logos only. */}
              {firms.length === 1 && firmNames.length <= 18 && (
                <span className="truncate text-[20px] font-medium text-white/70">{firmNames}</span>
              )}
            </span>
          ) : undefined
        }
        right={badgeLabel}
      />
    </ShareCardFrame>
  );
}
