'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import type { Trade } from '@/lib/types/trade';
import { cn } from '@/lib/utils';

type TradeGroupDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  trades: Trade[];
  onOpenTrade: (trade: Trade) => void;
};

const TRADES_PER_PAGE = 12;

function netPnl(trade: Trade) {
  return trade.pnl - trade.commission;
}

function getTradeDate(trade: Trade) {
  const date = new Date(trade.exitDate || trade.entryDate || trade.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTradeTime(trade: Trade) {
  const time =
    trade.exitDate?.split('T')[1] || trade.entryDate?.split('T')[1] || '';
  return time.slice(0, 5) || '-';
}

function getTradeSortTime(trade: Trade) {
  return getTradeDate(trade)?.getTime() ?? 0;
}

function formatCurrency(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function EconomicValue({
  value,
  streamerMode,
  className,
}: {
  value: number;
  streamerMode: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        value > 0 && 'text-profit',
        value < 0 && 'text-loss',
        value === 0 && 'text-muted-foreground',
        className
      )}
    >
      {streamerMode ? '******' : formatCurrency(value)}
    </span>
  );
}

function SummaryStat({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/35 p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 font-mono text-sm font-semibold text-foreground">
        {children}
      </div>
    </div>
  );
}

export function TradeGroupDetailDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  trades,
  onOpenTrade,
}: TradeGroupDetailDialogProps) {
  const { streamerMode } = useStreamerMode();
  const [currentPage, setCurrentPage] = useState(1);
  const sortedTrades = useMemo(
    () => [...trades].sort((a, b) => getTradeSortTime(b) - getTradeSortTime(a)),
    [trades]
  );
  const totalPages = Math.max(1, Math.ceil(sortedTrades.length / TRADES_PER_PAGE));
  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages]
  );
  const paginatedTrades = useMemo(
    () =>
      sortedTrades.slice(
        (currentPage - 1) * TRADES_PER_PAGE,
        currentPage * TRADES_PER_PAGE
      ),
    [currentPage, sortedTrades]
  );
  const visibleFrom =
    sortedTrades.length > 0 ? (currentPage - 1) * TRADES_PER_PAGE + 1 : 0;
  const visibleTo = Math.min(currentPage * TRADES_PER_PAGE, sortedTrades.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [title, trades]);

  const totalPnl = useMemo(
    () => sortedTrades.reduce((sum, trade) => sum + netPnl(trade), 0),
    [sortedTrades]
  );
  const wins = sortedTrades.filter((trade) => netPnl(trade) > 0).length;
  const winRate = sortedTrades.length > 0 ? (wins / sortedTrades.length) * 100 : 0;
  const pnlValues = sortedTrades.map(netPnl);
  const bestTrade = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
  const worstTrade = pnlValues.length > 0 ? Math.min(...pnlValues) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] w-[94vw] max-w-[860px] gap-0 overflow-hidden border-border bg-card p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="font-mono text-base font-semibold tracking-wide">
            {title}
          </DialogTitle>
          {subtitle && (
            <DialogDescription className="font-mono text-xs">
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="ej-scrollbar overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <SummaryStat label="Trade">{sortedTrades.length}</SummaryStat>
            <SummaryStat label="P&L totale">
              <EconomicValue value={totalPnl} streamerMode={streamerMode} />
            </SummaryStat>
            <SummaryStat label="Winrate">{formatPercent(winRate)}</SummaryStat>
            <SummaryStat label="Migliore">
              <EconomicValue value={bestTrade} streamerMode={streamerMode} />
            </SummaryStat>
            <SummaryStat label="Peggiore">
              <EconomicValue value={worstTrade} streamerMode={streamerMode} />
            </SummaryStat>
          </div>

          <div className="mt-4 space-y-2">
            {sortedTrades.length === 0 ? (
              <div className="rounded-xl border border-border bg-background/35 p-4 text-center font-mono text-xs text-muted-foreground">
                Nessun trade trovato per questo criterio.
              </div>
            ) : (
              paginatedTrades.map((trade) => {
                const date = getTradeDate(trade);
                const pnl = netPnl(trade);

                return (
                  <div
                    key={trade.id}
                    className="grid grid-cols-2 items-center gap-3 rounded-xl border border-border/80 bg-background/35 p-3 font-mono text-xs md:grid-cols-[112px_64px_82px_86px_minmax(0,1fr)_96px_auto]"
                  >
                    <span className="text-foreground">
                      {date
                        ? date.toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '-'}
                    </span>
                    <span className="text-muted-foreground">
                      {getTradeTime(trade)}
                    </span>
                    <span className="text-muted-foreground">
                      {trade.pair?.trim() || '-'}
                    </span>
                    <span className="capitalize text-muted-foreground">
                      {trade.direction || '-'}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {trade.strategy?.trim() || '-'}
                    </span>
                    <EconomicValue
                      value={pnl}
                      streamerMode={streamerMode}
                      className="font-semibold"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg border-border bg-background/50 px-3 font-mono text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                      onClick={() => onOpenTrade(trade)}
                    >
                      Apri
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <span className="font-mono text-[10px] text-muted-foreground">
                Mostrati {visibleFrom}-{visibleTo} di {sortedTrades.length} trade
              </span>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 rounded-lg border border-border bg-background/50 p-0 font-mono text-xs text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  &lt;
                </Button>
                {pageNumbers.map((page) => (
                  <Button
                    key={page}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-9 w-9 rounded-lg border border-border bg-background/50 p-0 font-mono text-xs text-muted-foreground hover:bg-secondary hover:text-foreground',
                      page === currentPage &&
                        'bg-profit/20 text-foreground hover:bg-profit/25'
                    )}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 rounded-lg border border-border bg-background/50 p-0 font-mono text-xs text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                >
                  &gt;
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
