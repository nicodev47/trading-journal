'use client';

import {
  AccountList,
  type AccountChip,
  AttachmentItem,
  DetailCard,
  EconomicValue,
  getTagLabel,
  getTradeDate,
  getTradeTime,
  netPnl,
  normalizeScreenshots,
} from '@/components/trading-journal/trade-detail-dialog';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import type { Trade } from '@/lib/types/trade';

/** Read-only detail of one trade: same layout as the dashboard's "Dettaglio trade". */
export function TradeDetailCard({ trade, accounts }: { trade: Trade; accounts: AccountChip[] }) {
  const { streamerMode } = useStreamerMode();
  const date = getTradeDate(trade);
  const screenshots = normalizeScreenshots(trade);
  const tags = trade.tags ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:gap-3 md:grid-cols-3">
        <DetailCard label="Data">
          {date
            ? date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '—'}
        </DetailCard>
        <DetailCard label="P&L">
          <EconomicValue value={netPnl(trade)} streamerMode={streamerMode} className="font-semibold" />
        </DetailCard>
        <DetailCard label="Direzione">
          <span className="capitalize">{trade.direction || '—'}</span>
        </DetailCard>
        <DetailCard label="Setup">{trade.strategy?.trim() || '—'}</DetailCard>
        <DetailCard label="Orario">{getTradeTime(trade)}</DetailCard>
        <DetailCard label="Asset">{trade.pair?.trim() || '—'}</DetailCard>
      </div>

      <DetailCard label="Eseguito su">
        <AccountList accounts={accounts} />
      </DetailCard>

      <DetailCard label="Note complete">
        <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
          {trade.notes?.trim() || '—'}
        </p>
      </DetailCard>

      <DetailCard label="Tags">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="rounded-lg border border-border bg-white/[0.07] px-2.5 py-1.5 font-sans tabular-nums text-xs text-foreground"
              >
                {getTagLabel(tag)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </DetailCard>

      <DetailCard label="Link TradingView e immagini">
        {screenshots.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {screenshots.map((screenshot, index) => (
              <AttachmentItem key={`${screenshot.url}-${index}`} screenshot={screenshot} index={index} />
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </DetailCard>
    </div>
  );
}
