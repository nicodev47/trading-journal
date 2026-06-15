'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, TrendingUp, TrendingDown, Star, Image } from 'lucide-react';
import { formatDateTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import type { Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

interface TradeListProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  trades: Trade[];
  onAddNew: () => void;
  onEditTrade: (trade: Trade) => void;
}

export function TradeList({
  isOpen,
  onClose,
  date,
  trades,
  onAddNew,
  onEditTrade,
}: TradeListProps) {
  const { streamerMode } = useStreamerMode();
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl - t.commission, 0);
  const totalPips = trades.reduce((sum, t) => sum + t.pips, 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Trades on {date}</span>
            <Button size="sm" onClick={onAddNew} className="gap-1">
              <Plus className="size-4" />
              Add Trade
            </Button>
          </SheetTitle>
        </SheetHeader>

        {/* Day Summary */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Day P&L</p>
            <p className={cn(
              'font-mono text-xl font-bold',
              totalPnl > 0 && 'text-profit',
              totalPnl < 0 && 'text-loss',
              totalPnl === 0 && 'text-muted-foreground'
            )}>
              {streamerMode
                ? '******'
                : `$${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Pips</p>
            <p className={cn(
              'font-mono text-xl font-bold',
              totalPips > 0 && 'text-profit',
              totalPips < 0 && 'text-loss',
              totalPips === 0 && 'text-muted-foreground'
            )}>
              {streamerMode
                ? '******'
                : `${totalPips >= 0 ? '+' : ''}${totalPips.toFixed(1)}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Trades</p>
            <p className="font-mono text-xl font-bold">{trades.length}</p>
          </div>
        </div>

        {/* Trade List */}
        <ScrollArea className="mt-4 h-[calc(100vh-220px)]">
          {trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No trades recorded for this day
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddNew}
                className="mt-4 gap-1"
              >
                <Plus className="size-4" />
                Add Your First Trade
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {trades.map(trade => (
                <button
                  key={trade.id}
                  onClick={() => onEditTrade(trade)}
                  className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'flex size-8 items-center justify-center rounded-full',
                        trade.direction === 'long' ? 'bg-profit/20' : 'bg-loss/20'
                      )}>
                        {trade.direction === 'long' ? (
                          <TrendingUp className="size-4 text-profit" />
                        ) : (
                          <TrendingDown className="size-4 text-loss" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{trade.pair}</p>
                        <p className="text-xs text-muted-foreground">
                          {trade.direction === 'long' ? 'Long' : 'Short'} • {trade.lotSize} lots
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'font-mono font-semibold',
                        (trade.pnl - trade.commission) > 0 && 'text-profit',
                        (trade.pnl - trade.commission) < 0 && 'text-loss'
                      )}>
                        {streamerMode
                          ? '******'
                          : `$${(trade.pnl - trade.commission) >= 0 ? '+' : ''}${(
                              trade.pnl - trade.commission
                            ).toFixed(2)}`}
                      </p>
                      <p className={cn(
                        'font-mono text-xs',
                        trade.pips > 0 && 'text-profit/70',
                        trade.pips < 0 && 'text-loss/70'
                      )}>
                        {streamerMode
                          ? '******'
                          : `${trade.pips >= 0 ? '+' : ''}${trade.pips.toFixed(
                              1
                            )} pips`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDateTime(trade.exitDate)}</span>
                    {trade.strategy && (
                      <>
                        <span>•</span>
                        <span>{trade.strategy}</span>
                      </>
                    )}
                    {trade.screenshots.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Image className="size-3" />
                          {trade.screenshots.length}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Tags and Rating */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {trade.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                      {trade.tags.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{trade.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={cn(
                            'size-3',
                            star <= trade.setupRating
                              ? 'fill-yellow-500 text-yellow-500'
                              : 'text-muted-foreground/30'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
