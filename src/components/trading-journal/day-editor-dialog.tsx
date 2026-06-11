'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from '@/components/ui/select';
import { X, Plus, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Trade, type ScreenshotData } from '@/lib/types/trade';
import { generateId } from '@/lib/calculations';

interface TradeRow {
  id: string;
  pnl: string;
  symbol: string;
  direction: 'long' | 'short' | '';
  time: string;
  setup: string;
  screenshots: ScreenshotData[];
  notes: string;
}

interface DayEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  existingTrades: Trade[];
  onSave: (trades: Trade[]) => void;
  onDeleteDay: () => void;
  strategies: string[];
  onAddStrategy: (strategy: string) => void;
  onRemoveStrategy: (strategy: string) => void;
}

export function DayEditorDialog({
  isOpen,
  onClose,
  date,
  existingTrades,
  onSave,
  onDeleteDay,
  strategies = [],
  onAddStrategy,
  onRemoveStrategy,
}: DayEditorDialogProps) {
  const [tradeRows, setTradeRows] = useState<TradeRow[]>([]);
  const [activeSetupDropdown, setActiveSetupDropdown] = useState<string | null>(null);
  const [screenshotInputs, setScreenshotInputs] = useState<Record<string, { url: string; name: string }>>({});
  const [pendingNewStrategies, setPendingNewStrategies] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (existingTrades.length > 0) {
        setTradeRows(
          existingTrades.map(t => ({
            id: t.id,
            pnl: t.pnl.toString(),
            symbol: t.pair,
            direction: t.direction,
            time: (t.exitDate?.split('T')[1] || t.entryDate?.split('T')[1] || '').slice(0, 5),
            setup: t.strategy,
            screenshots: (t.screenshots || []).map(s => {
              if (typeof s === 'object' && s !== null && 'url' in s) {
                return s as ScreenshotData;
              }

              if (typeof s === 'string') {
                try {
                  const parsed = JSON.parse(s);
                  if (parsed && typeof parsed === 'object' && 'url' in parsed) {
                    return parsed as ScreenshotData;
                  }
                } catch {
                  // Not JSON, treat as plain URL
                }

                return { url: s, name: '' };
              }

              return { url: '', name: '' };
            }),
            notes: t.notes || '',
          }))
        );
      } else {
        setTradeRows([createEmptyRow()]);
      }

      setScreenshotInputs({});
      setPendingNewStrategies([]);
    }
  }, [isOpen, existingTrades]);

  const createEmptyRow = (): TradeRow => ({
    id: generateId(),
    pnl: '',
    symbol: '',
    direction: '',
    time: '00:00',
    setup: '',
    screenshots: [],
    notes: '',
  });

  const addTradeRow = () => {
    setTradeRows(prev => [...prev, createEmptyRow()]);
  };

  const removeTradeRow = (id: string) => {
    if (tradeRows.length > 1) {
      setTradeRows(prev => prev.filter(row => row.id !== id));
    }
  };

  const updateTradeRow = (
    id: string,
    field: keyof TradeRow,
    value: string | ScreenshotData[]
  ) => {
    setTradeRows(prev =>
      prev.map(row => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addScreenshotToTrade = (tradeId: string) => {
    const input = screenshotInputs[tradeId];
    const url = input?.url?.trim();

    if (!url) return;

    const trade = tradeRows.find(r => r.id === tradeId);
    if (!trade) return;

    const newScreenshot: ScreenshotData = {
      url,
      name: input?.name?.trim() || '',
    };

    updateTradeRow(tradeId, 'screenshots', [...trade.screenshots, newScreenshot]);
    setScreenshotInputs(prev => ({ ...prev, [tradeId]: { url: '', name: '' } }));
  };

  const removeScreenshotFromTrade = (tradeId: string, index: number) => {
    const trade = tradeRows.find(r => r.id === tradeId);

    if (trade) {
      updateTradeRow(
        tradeId,
        'screenshots',
        trade.screenshots.filter((_, i) => i !== index)
      );
    }
  };

  const getFilteredStrategies = (search: string) => {
    const allStrategies = [...strategies, ...pendingNewStrategies];
    if (!search) return allStrategies;

    const searchLower = search.toLowerCase();
    return allStrategies.filter(s => s.toLowerCase().includes(searchLower));
  };

  const isSetupSalvad = (setup: string) => {
    if (!setup.trim()) return true;
    return strategies.includes(setup) || pendingNewStrategies.includes(setup);
  };

  const addPendingStrategy = (setup: string) => {
    const trimmed = setup.trim();

    if (
      trimmed &&
      !strategies.includes(trimmed) &&
      !pendingNewStrategies.includes(trimmed)
    ) {
      setPendingNewStrategies(prev => [...prev, trimmed]);
    }
  };

  const dayTotal = useMemo(() => {
    return tradeRows.reduce((sum, row) => sum + (parseFloat(row.pnl) || 0), 0);
  }, [tradeRows]);

  const handleSalva = () => {
    pendingNewStrategies.forEach(strategy => {
      onAddStrategy(strategy);
    });

    const now = new Date().toISOString();

    const trades: Trade[] = tradeRows
      .filter(row => row.pnl !== '' || row.symbol)
      .map(row => ({
        id: row.id,
        pair: row.symbol || '',
        direction: row.direction || 'long',
        entryPrice: 0,
        exitPrice: 0,
        lotSize: 0.01,
        stopLoss: 0,
        takeProfit: 0,
        entryDate: `${date}T${row.time || '00:00'}`,
        exitDate: `${date}T${row.time || '00:00'}`,
        pips: 0,
        pnl: parseFloat(row.pnl) || 0,
        commission: 0,
        riskReward: 0,
        screenshots: row.screenshots,
        tags: [],
        strategy: row.setup,
        notes: row.notes,
        emotionalState: 'neutral' as const,
        setupRating: 3,
        createdAt: now,
        updatedAt: now,
      }));

    onSave(trades);
    onClose();
  };

  const getTradingViewImageUrl = (url: string): string => {
    if (url.startsWith('data:image/')) {
      return url;
    }

    if (url.includes('s3.tradingview.com/snapshots')) {
      return url;
    }

    const match = url.match(/tradingview\.com\/x\/([A-Za-z0-9]+)/);

    if (match) {
      return `https://s3.tradingview.com/snapshots/t/${match[1]}.png`;
    }

    return url;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-h-[86vh] w-[92vw] max-w-4xl gap-0 overflow-hidden bg-card p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="font-mono text-base font-medium tracking-wide">
            Nuovo trade
          </DialogTitle>
          <DialogDescription className="sr-only">
            Aggiungi P&L, simbolo, direzione, orario, setup e screenshot per ogni trade.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[calc(86vh-120px)] flex-col gap-3 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground">
            Il P&L viene conteggiato nelle statistiche. Simbolo / Direzione / Orario / Setup sono opzionali.
          </p>

          <div className="flex flex-col gap-4">
            {tradeRows.map((row, rowIndex) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/20 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    Trade {rowIndex + 1}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTradeRow(row.id)}
                    disabled={tradeRows.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[130px_95px_105px_115px_1fr]">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      P&L
                    </Label>

                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={row.pnl}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || val === '-' || /^-?\d*\.?\d*$/.test(val)) {
                            updateTradeRow(row.id, 'pnl', val);
                          }
                        }}
                        placeholder="0"
                        className={cn(
                          'h-9 w-full border-border bg-background pr-7 font-mono text-sm',
                          parseFloat(row.pnl) > 0 && 'border-profit/50 text-profit',
                          parseFloat(row.pnl) < 0 && 'border-loss/50 text-loss'
                        )}
                      />

                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                        <span className="text-xs text-muted-foreground">$</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Simbolo
                    </Label>

                    <Select
                      value={row.symbol}
                      onValueChange={v => updateTradeRow(row.id, 'symbol', v)}
                    >
                      <SelectTrigger className="h-9 w-full border-border bg-background text-sm">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="NQ">NQ</SelectItem>
                          <SelectItem value="MNQ">MNQ</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Direzione
                    </Label>

                    <Select
                      value={row.direction}
                      onValueChange={v => updateTradeRow(row.id, 'direction', v)}
                    >
                      <SelectTrigger className="h-9 w-full border-border bg-background text-sm">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="long">Long</SelectItem>
                          <SelectItem value="short">Short</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Orario
                    </Label>

                    <Input
                      type="time"
                      value={row.time}
                      onChange={e => updateTradeRow(row.id, 'time', e.target.value)}
                      className={cn(
                        'h-9 w-full border-border bg-background font-mono text-sm',
                        row.time === '00:00' && 'text-muted-foreground/70'
                      )}
                      placeholder="00:00"
                    />
                  </div>

                  <div className="relative flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Setup
                    </Label>

                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          value={row.setup}
                          onChange={e => {
                            updateTradeRow(row.id, 'setup', e.target.value);
                            setActiveSetupDropdown(row.id);
                          }}
                          onFocus={() => setActiveSetupDropdown(row.id)}
                          onBlur={() => setTimeout(() => setActiveSetupDropdown(null), 150)}
                          placeholder="Nome setup..."
                          className="h-9 w-full border-border bg-background text-sm"
                        />

                        {activeSetupDropdown === row.id &&
                          (getFilteredStrategies(row.setup).length > 0 || row.setup.trim()) && (
                            <div className="absolute top-full z-50 mt-1 max-h-[200px] w-full overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                              {row.setup.trim() && !isSetupSalvad(row.setup) && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm text-profit hover:bg-secondary"
                                  onMouseDown={() => {
                                    addPendingStrategy(row.setup);
                                    setActiveSetupDropdown(null);
                                  }}
                                >
                                  <Plus className="size-4" />
                                  Salva &quot;{row.setup}&quot; come preset
                                </button>
                              )}

                              {getFilteredStrategies(row.setup).map(strategy => (
                                <div
                                  key={strategy}
                                  className="flex w-full items-center justify-between px-3 py-2 hover:bg-secondary"
                                >
                                  <button
                                    type="button"
                                    className="flex-1 text-left text-sm"
                                    onMouseDown={() => {
                                      updateTradeRow(row.id, 'setup', strategy);
                                      setActiveSetupDropdown(null);
                                    }}
                                  >
                                    {strategy}
                                    {pendingNewStrategies.includes(strategy) && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        (nuovo)
                                      </span>
                                    )}
                                  </button>

                                  {!pendingNewStrategies.includes(strategy) && (
                                    <button
                                      type="button"
                                      className="ml-2 p-1 text-muted-foreground hover:text-destructive"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        onRemoveStrategy(strategy);
                                      }}
                                      title="Elimina preset"
                                    >
                                      <Trash2 className="size-3" />
                                    </button>
                                  )}

                                  {pendingNewStrategies.includes(strategy) && (
                                    <button
                                      type="button"
                                      className="ml-2 p-1 text-muted-foreground hover:text-destructive"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setPendingNewStrategies(prev =>
                                          prev.filter(s => s !== strategy)
                                        );
                                      }}
                                      title="Annulla aggiunta preset"
                                    >
                                      <X className="size-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>

                    {row.setup.trim() && !isSetupSalvad(row.setup) && (
                      <p className="text-xs text-muted-foreground">
                        Scrivi e clicca il menu per salvarlo come preset
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    Link TradingView o immagini locali
                  </p>

                  {row.screenshots.length > 0 && (
                    <div className="flex flex-col gap-3">
                      {row.screenshots.map((screenshot, index) => {
                        const imageUrl = getTradingViewImageUrl(screenshot.url);

                        return (
                          <div
                            key={index}
                            className="flex flex-col gap-2 rounded-md border border-border bg-background p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-medium text-foreground">
                                {screenshot.name || `Screenshot ${index + 1}`}
                              </span>

                              <button
                                onClick={() => removeScreenshotFromTrade(row.id, index)}
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>

                            {!screenshot.url.startsWith('data:image/') && (
                              <span className="truncate text-xs text-muted-foreground">
                                {screenshot.url}
                              </span>
                            )}

                            <div className="relative overflow-hidden rounded border border-border">
                              <img
                                src={imageUrl}
                                alt={
                                  screenshot.name ||
                                  `Trade ${rowIndex + 1} screenshot ${index + 1}`
                                }
                                className="w-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>

                            <div className="flex items-center justify-end text-xs">
                              <a
                                href={screenshot.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-foreground hover:text-profit"
                              >
                                Apri <ExternalLink className="size-3" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr_auto]">
                      <Input
                        type="text"
                        value={screenshotInputs[row.id]?.name || ''}
                        onChange={e =>
                          setScreenshotInputs(prev => ({
                            ...prev,
                            [row.id]: {
                              ...prev[row.id],
                              name: e.target.value,
                              url: prev[row.id]?.url || '',
                            },
                          }))
                        }
                        placeholder="Nome (opzionale)"
                        className="h-8 border-border bg-background text-sm"
                      />

                      <Input
                        type="url"
                        value={screenshotInputs[row.id]?.url || ''}
                        onChange={e =>
                          setScreenshotInputs(prev => ({
                            ...prev,
                            [row.id]: {
                              ...prev[row.id],
                              url: e.target.value,
                              name: prev[row.id]?.name || '',
                            },
                          }))
                        }
                        placeholder="inserisci il Link di TradingView / Link di Google Drive..."
                        className="h-8 border-border bg-background text-sm"
                        onKeyDown={e => e.key === 'Enter' && addScreenshotToTrade(row.id)}
                      />

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addScreenshotToTrade(row.id)}
                        className="h-8 shrink-0 gap-1.5 border-border text-xs"
                        disabled={!screenshotInputs[row.id]?.url?.trim()}
                      >
                        <Plus className="size-3" />
                        Aggiungi
                      </Button>
                    </div>

                    {screenshotInputs[row.id]?.url?.trim() && (
                      <div className="overflow-hidden rounded-md border border-border bg-background">
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Anteprima
                        </div>

                        <img
                          src={getTradingViewImageUrl(screenshotInputs[row.id].url.trim())}
                          alt="Anteprima screenshot"
                          className="max-h-[260px] w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />

                        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
                          <span>Link TradingView convertito in URL immagine diretto.</span>

                          <button
                            type="button"
                          
                            className="flex items-center gap-1 text-foreground hover:text-profit"
                          >
                            Apri <ExternalLink className="size-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Note trade {rowIndex + 1}
                  </Label>

                  <Textarea
                    value={row.notes}
                    onChange={e => updateTradeRow(row.id, 'notes', e.target.value)}
                    placeholder="Cosa è successo in questo trade? Strategia, errori, lezioni..."
                    className="min-h-[72px] resize-y border-border bg-background text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={addTradeRow}
              className="gap-2 border-border"
            >
              <Plus className="size-4" />
              Aggiungi trade
            </Button>

            <span className="font-mono text-sm text-muted-foreground">
              Trade: {tradeRows.length} | Totale giorno:{' '}
              <span className={cn(dayTotal > 0 && 'text-profit', dayTotal < 0 && 'text-loss')}>
                {dayTotal.toFixed(2)} USD
              </span>
            </span>
          </div>

          {pendingNewStrategies.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Nuovi preset da salvare: {pendingNewStrategies.join(', ')}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button variant="destructive" onClick={onDeleteDay}>
            Elimina giorno
          </Button>

          <Button onClick={handleSalva} className="bg-profit text-background hover:bg-profit/90">
            Salva
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}