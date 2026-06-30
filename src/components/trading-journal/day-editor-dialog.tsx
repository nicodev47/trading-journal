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
  DialogFooter,
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
import {
  Check,
  ExternalLink,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CUSTOM_TAG_PREFIX,
  TRADE_TAGS,
  VALID_TRADE_SETUPS,
  getEditableSetupValue,
  type Trade,
  type ScreenshotData,
} from '@/lib/types/trade';
import { generateId } from '@/lib/calculations';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { PROFILE_NAME_KEY } from '@/lib/export-filename';
import { TradeShareDialog } from './trade-share-dialog';

interface TradeRow {
  id: string;
  pnl: string;
  symbol: string;
  direction: 'long' | 'short' | '';
  time: string;
  setup: string;
  originalSetup: string;
  tags: string[];
  isFavorite: boolean;
  screenshots: ScreenshotData[];
  notes: string;
}

type LegacyTrade = Trade & { mistakes?: string[] };

function formatPnlDraft(value: string): string {
  let next = value.replace(/\./g, ',').replace(/[^\d,-]/g, '');
  const isNegative = next.startsWith('-');

  next = next.replace(/-/g, '');

  const [integerPart, ...decimalParts] = next.split(',');
  const decimalPart = decimalParts.join('').slice(0, 2);
  const unsignedValue =
    decimalParts.length > 0 ? `${integerPart},${decimalPart}` : integerPart;

  return isNegative ? `-${unsignedValue}` : unsignedValue;
}

function getPnlNumber(value: string): number {
  const pnl = Number(value.replace(',', '.'));

  return Number.isFinite(pnl) ? pnl : 0;
}

function formatTimeDraft(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function normalizeTime(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length === 0) {
    return '00:00';
  }

  const hours = digits.slice(0, 2);
  const minutes = digits.slice(2, 4);
  const safeHours = Math.min(Number(hours || 0), 23);
  const safeMinutes = Math.min(Number(minutes.padEnd(2, '0') || 0), 59);

  return `${String(safeHours).padStart(2, '0')}:${String(safeMinutes).padStart(2, '0')}`;
}

function formatDialogDate(date: string | Date) {
  if (typeof date === 'string') {
    const [year, month, day] = date.split('-');

    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }

  const parsedDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Trade';
  }

  return parsedDate.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface DayEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  existingTrades: Trade[];
  onSave: (trades: Trade[]) => void;
  onDeleteDay: () => void;
  strategies: string[];
  customTags: string[];
  onAddStrategy: (strategy: string) => void;
  onRemoveStrategy: (strategy: string) => void;
  onAddCustomTag: (tag: string) => void;
  onRemoveCustomTag: (tag: string) => void;
}

export function DayEditorDialog({
  isOpen,
  onClose,
  date,
  existingTrades,
  onSave,
  onDeleteDay,
  customTags = [],
  onAddCustomTag,
  onRemoveCustomTag,
}: DayEditorDialogProps) {
  const { streamerMode } = useStreamerMode();
  const [tradeRows, setTradeRows] = useState<TradeRow[]>([]);
  const [timeDrafts, setTimeDrafts] = useState<Record<string, string>>({});
  const [screenshotInputs, setScreenshotInputs] = useState<Record<string, { url: string; name: string }>>({});
  const [customTagInputs, setCustomTagInputs] = useState<Record<string, string>>({});
  const [isManagingTags, setIsManagingTags] = useState(false);
  const [tradeToDeleteId, setTradeToDeleteId] = useState<string | null>(null);
  const [isDeleteDayConfirmOpen, setIsDeleteDayConfirmOpen] = useState(false);
  const [selectedShareTrade, setSelectedShareTrade] = useState<Trade | null>(null);
  const [editingScreenshot, setEditingScreenshot] = useState<{
    tradeId: string;
    index: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingTrades.length > 0) {
        setTradeRows(
          existingTrades.map(t => {
            const legacyTrade = t as LegacyTrade;

            return {
            id: t.id,
            pnl: formatPnlDraft(t.pnl.toString()),
            symbol: t.pair,
            direction: t.direction,
            time: normalizeTime(
              (t.exitDate?.split('T')[1] || t.entryDate?.split('T')[1] || '').slice(0, 5)
            ),
            setup: getEditableSetupValue(t.strategy),
            originalSetup: t.strategy || '',
            tags: t.tags?.length ? t.tags : legacyTrade.mistakes ?? [],
            isFavorite: t.isFavorite ?? false,
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
            };
          })
        );
      } else {
        setTradeRows([createEmptyRow()]);
      }

      setScreenshotInputs({});
      setTimeDrafts({});
      setCustomTagInputs({});
      setIsManagingTags(false);
      setEditingScreenshot(null);
    }
  }, [isOpen, existingTrades]);

  const createEmptyRow = (): TradeRow => ({
    id: generateId(),
    pnl: '',
    symbol: '',
    direction: '',
    time: '00:00',
    setup: '',
    originalSetup: '',
    tags: [],
    isFavorite: false,
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

  const confirmRemoveTradeRow = () => {
    if (tradeToDeleteId) {
      removeTradeRow(tradeToDeleteId);
      setTradeToDeleteId(null);
    }
  };

  const updateTradeRow = (
    id: string,
    field: keyof TradeRow,
    value: string | boolean | string[] | ScreenshotData[]
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

  const saveScreenshotName = () => {
    if (!editingScreenshot) return;

    const trade = tradeRows.find(row => row.id === editingScreenshot.tradeId);
    const screenshot = trade?.screenshots[editingScreenshot.index];
    if (!trade || !screenshot) {
      setEditingScreenshot(null);
      return;
    }

    const nextName =
      editingScreenshot.name.trim() || screenshot.name?.trim() || 'Link';
    const screenshots = trade.screenshots.map((item, index) =>
      index === editingScreenshot.index ? { ...item, name: nextName } : item
    );

    updateTradeRow(trade.id, 'screenshots', screenshots);
    setEditingScreenshot(null);
  };

  const dayTotal = useMemo(() => {
    return tradeRows.reduce((sum, row) => sum + getPnlNumber(row.pnl), 0);
  }, [tradeRows]);

  const initialShareHandle = useMemo(() => {
    try {
      return localStorage.getItem(PROFILE_NAME_KEY) || '';
    } catch {
      return '';
    }
  }, [isOpen]);

  const getTradeFromRow = (row: TradeRow): Trade => {
    const pendingCustomTag = customTagInputs[row.id]?.trim()
      ? `${CUSTOM_TAG_PREFIX}${customTagInputs[row.id].trim()}`
      : null;
    const tags =
      pendingCustomTag && !row.tags.includes(pendingCustomTag)
        ? [...row.tags, pendingCustomTag]
        : row.tags;
    const now = new Date().toISOString();
    const tradeTime = normalizeTime(timeDrafts[row.id] ?? row.time);

    return {
      id: row.id,
      pair: row.symbol || '',
      direction: row.direction || 'long',
      entryPrice: 0,
      exitPrice: 0,
      lotSize: 0.01,
      stopLoss: 0,
      takeProfit: 0,
      entryDate: `${date}T${tradeTime}:00`,
      exitDate: `${date}T${tradeTime}:00`,
      pips: 0,
      pnl: getPnlNumber(row.pnl),
      commission: 0,
      riskReward: 0,
      screenshots: row.screenshots,
      tags,
      isFavorite: row.isFavorite,
      strategy: row.setup || row.originalSetup,
      notes: row.notes,
      emotionalState: 'neutral',
      setupRating: 3,
      createdAt: now,
      updatedAt: now,
    };
  };

  const handleSalva = () => {
    Object.values(customTagInputs).forEach((input) => {
      const label = input.trim();

      if (label) {
        onAddCustomTag(`${CUSTOM_TAG_PREFIX}${label}`);
      }
    });

    const now = new Date().toISOString();

    const trades: Trade[] = tradeRows
      .filter(row => row.pnl !== '' || row.symbol)
      .map(row => {
        const customTag = customTagInputs[row.id]?.trim();
        const pendingCustomTag = customTag
          ? `${CUSTOM_TAG_PREFIX}${customTag}`
          : null;
        const tags =
          pendingCustomTag && !row.tags.includes(pendingCustomTag)
            ? [...row.tags, pendingCustomTag]
            : row.tags;

        const tradeTime = normalizeTime(timeDrafts[row.id] ?? row.time);

        return {
          id: row.id,
          pair: row.symbol || '',
          direction: row.direction || 'long',
          entryPrice: 0,
          exitPrice: 0,
          lotSize: 0.01,
          stopLoss: 0,
          takeProfit: 0,
          entryDate: `${date}T${tradeTime}:00`,
          exitDate: `${date}T${tradeTime}:00`,
          pips: 0,
          pnl: getPnlNumber(row.pnl),
          commission: 0,
          riskReward: 0,
          screenshots: row.screenshots,
          tags,
          isFavorite: row.isFavorite,
          strategy: row.setup || row.originalSetup,
          notes: row.notes,
          emotionalState: 'neutral' as const,
          setupRating: 3,
          createdAt: now,
          updatedAt: now,
        };
      });

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
        className="max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-4xl gap-0 overflow-hidden bg-card p-0 sm:w-[92vw] sm:max-h-[86vh]"
        data-tutorial="trade-editor"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-border px-4 py-3.5 text-left sm:px-6 sm:py-4">
          <DialogTitle className="font-mono text-base font-medium tracking-wide">
            {formatDialogDate(date)}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Aggiungi P&L, simbolo, direzione, orario, setup e screenshot per ogni trade.
          </DialogDescription>
        </DialogHeader>

        <div className="ej-scrollbar flex max-h-[calc(92dvh-116px)] flex-col gap-3 overflow-y-auto overscroll-contain p-3 sm:max-h-[calc(86vh-120px)] sm:gap-4 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {tradeRows.map((row, rowIndex) => (
              <div
                key={row.id}
                className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-border bg-secondary/15 p-3 sm:gap-3.5 sm:p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    Trade {rowIndex + 1}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 gap-2 rounded-xl border-[#0f8f6f] bg-[#06251f] px-3.5 font-mono text-sm font-semibold text-[#00f0aa] shadow-none transition-colors duration-150 hover:border-[#119979] hover:bg-[#073128] hover:text-[#00f0aa] hover:shadow-none"
                      onClick={() => setSelectedShareTrade(getTradeFromRow(row))}
                    >
                      <span
                        className="block shrink-0 text-base leading-none"
                        aria-hidden="true"
                      >
                        📷
                      </span>
                      Share
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'size-7 rounded-lg text-muted-foreground hover:bg-secondary/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-yellow-400/70',
                        row.isFavorite &&
                          'text-yellow-400 hover:text-yellow-300'
                      )}
                      onClick={() =>
                        updateTradeRow(row.id, 'isFavorite', !row.isFavorite)
                      }
                      aria-label={
                        row.isFavorite
                          ? 'Rimuovi dai trade preferiti'
                          : 'Segna come trade preferito'
                      }
                      aria-pressed={row.isFavorite}
                    >
                      <Star
                        className={cn(
                          'size-[19px]',
                          row.isFavorite && 'fill-current'
                        )}
                      />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-lg border border-transparent text-muted-foreground hover:border-loss/80 hover:bg-loss/90 hover:text-white"
                      onClick={() => setTradeToDeleteId(row.id)}
                      disabled={tradeRows.length === 1}
                      aria-label={`Elimina trade ${rowIndex + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/30 p-3 sm:p-3.5">
                  <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Dettagli trade
                  </p>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_120px_130px_120px_minmax(220px,1fr)]">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      P&L
                    </Label>

                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={streamerMode ? '******' : row.pnl}
                        readOnly={streamerMode}
                        onChange={e =>
                          updateTradeRow(
                            row.id,
                            'pnl',
                            formatPnlDraft(e.target.value)
                          )
                        }
                        placeholder="0"
                        className={cn(
                          'h-9 w-full border-border bg-background pr-7 font-mono text-sm',
                          getPnlNumber(row.pnl) > 0 && 'border-profit/50 text-profit',
                          getPnlNumber(row.pnl) < 0 && 'border-loss/50 text-loss'
                        )}
                      />

                      {!streamerMode && (
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                          <span className="text-xs text-muted-foreground">$</span>
                        </div>
                      )}
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

                    <div className="w-full">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={timeDrafts[row.id] ?? row.time}
                        onFocus={(event) => {
                          if ((timeDrafts[row.id] ?? row.time) === '00:00') {
                            const input = event.currentTarget;

                            requestAnimationFrame(() => {
                              input.setSelectionRange(0, 0);
                            });
                          }
                        }}
                        onClick={(event) => {
                          if ((timeDrafts[row.id] ?? row.time) === '00:00') {
                            const input = event.currentTarget;

                            requestAnimationFrame(() => {
                              input.setSelectionRange(0, 0);
                            });
                          }
                        }}
                        onKeyDown={(event) => {
                          if (
                            (timeDrafts[row.id] ?? row.time) === '00:00' &&
                            /^\d$/.test(event.key)
                          ) {
                            event.preventDefault();
                            setTimeDrafts(prev => ({
                              ...prev,
                              [row.id]: event.key,
                            }));
                          }
                        }}
                        onChange={(e) => {
                          const draft = formatTimeDraft(e.target.value);

                          setTimeDrafts(prev => ({ ...prev, [row.id]: draft }));
                        }}
                        onBlur={() => {
                          const normalized = normalizeTime(
                            timeDrafts[row.id] ?? row.time
                          );

                          updateTradeRow(row.id, 'time', normalized);
                          setTimeDrafts(prev => ({
                            ...prev,
                            [row.id]: normalized,
                          }));
                        }}
                        className={cn(
                          'h-9 w-full border-border bg-background text-center font-mono text-sm placeholder:text-muted-foreground/70',
                          /\d/.test(timeDrafts[row.id] ?? row.time) &&
                            (timeDrafts[row.id] ?? row.time) !== '00:00'
                            ? 'text-foreground'
                            : 'text-muted-foreground/70'
                        )}
                        placeholder="00:00"
                        maxLength={5}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Setup
                    </Label>

                    <Select
                      value={row.setup}
                      onValueChange={value =>
                        updateTradeRow(row.id, 'setup', value)
                      }
                    >
                      <SelectTrigger className="h-9 w-full border-border bg-background text-sm">
                        <SelectValue placeholder="Seleziona setup" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectGroup>
                          {VALID_TRADE_SETUPS.map(setup => (
                            <SelectItem key={setup} value={setup}>
                              {setup}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                </div>
                <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 bg-background/30 p-3 sm:p-3.5">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    ANALISI TRADE
                  </p>

                  {row.screenshots.length > 0 && (
                    <div className="flex flex-col gap-3">
                      {row.screenshots.map((screenshot, index) => {
                        const imageUrl = getTradingViewImageUrl(screenshot.url);
                        const isEditingName =
                          editingScreenshot?.tradeId === row.id &&
                          editingScreenshot.index === index;

                        return (
                          <div
                            key={index}
                            className="flex flex-col gap-2 rounded-lg border border-border/80 bg-card/60 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {isEditingName ? (
                                <Input
                                  autoFocus
                                  value={editingScreenshot.name}
                                  onChange={(event) =>
                                    setEditingScreenshot(current =>
                                      current
                                        ? {
                                            ...current,
                                            name: event.target.value,
                                          }
                                        : current
                                    )
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      saveScreenshotName();
                                    }
                                    if (event.key === 'Escape') {
                                      event.preventDefault();
                                      setEditingScreenshot(null);
                                    }
                                  }}
                                  aria-label="Modifica nome link"
                                  className="h-8 min-w-0 flex-1 border-border bg-background font-mono text-xs"
                                />
                              ) : (
                                <span className="min-w-0 truncate font-mono text-xs font-medium text-foreground">
                                  {screenshot.name || 'Link'}
                                </span>
                              )}

                              <div className="flex shrink-0 items-center gap-1">
                                {isEditingName ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={saveScreenshotName}
                                      aria-label="Salva nome link"
                                      className="inline-flex h-8 items-center gap-1 rounded-md border border-profit/20 bg-profit/5 px-2 font-mono text-[10px] text-muted-foreground transition-colors hover:border-profit/40 hover:bg-profit/10 hover:text-profit"
                                    >
                                      <Check className="size-3" />
                                      Salva
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingScreenshot(null)}
                                      aria-label="Annulla modifica nome link"
                                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background/70 px-2 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                    >
                                      <X className="size-3" />
                                      Annulla
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingScreenshot({
                                        tradeId: row.id,
                                        index,
                                        name: screenshot.name || 'Link',
                                      })
                                    }
                                    aria-label="Modifica nome link"
                                    className="rounded-md border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-profit/30 hover:bg-profit/10 hover:text-profit"
                                  >
                                    <Pencil className="size-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    removeScreenshotFromTrade(row.id, index);
                                    if (isEditingName) {
                                      setEditingScreenshot(null);
                                    }
                                  }}
                                  aria-label="Elimina link"
                                  className="rounded-md border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
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
                        placeholder="Inserisci il timeframe"
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
                        placeholder="Inserisci il link di TradingView/Google Drive"
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

                <div className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border/70 bg-background/30 p-3 sm:p-3.5">
                  <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    TAGS
                  </Label>

                  <div className="flex flex-wrap gap-2">
                    {TRADE_TAGS.map((tag) => {
                      const isSelected = row.tags.includes(tag.value);

                      return (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => {
                            const nextTags = isSelected
                              ? row.tags.filter((value) => value !== tag.value)
                              : [...row.tags, tag.value];

                            updateTradeRow(row.id, 'tags', nextTags);
                          }}
                          className={cn(
                            'rounded-md border px-2.5 py-1.5 text-left font-mono text-[13px] leading-4 transition-colors',
                            isSelected
                              ? 'border-loss/50 bg-loss/10 text-loss'
                              : 'border-border bg-background/80 text-muted-foreground hover:bg-secondary hover:text-foreground'
                          )}
                        >
                          <span className="mr-2" aria-hidden="true">
                            {tag.emoji}
                          </span>
                          {tag.label}
                        </button>
                      );
                    })}

                    {customTags.map((tag) => {
                      const isSelected = row.tags.includes(tag);

                      return (
                        <div key={tag} className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              const nextTags = isSelected
                                ? row.tags.filter((value) => value !== tag)
                                : [...row.tags, tag];

                              updateTradeRow(row.id, 'tags', nextTags);
                            }}
                            className={cn(
                              'w-full rounded-md border px-2.5 py-1.5 text-left font-mono text-[13px] leading-4 transition-colors',
                              isSelected
                                ? 'border-loss/50 bg-loss/10 text-loss'
                                : 'border-border bg-background/80 text-muted-foreground hover:bg-secondary hover:text-foreground'
                            )}
                          >
                            {tag.slice(CUSTOM_TAG_PREFIX.length)}
                          </button>

                          {isManagingTags && (
                            <button
                              type="button"
                              aria-label={`Elimina ${tag.slice(CUSTOM_TAG_PREFIX.length)}`}
                              className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full border border-loss bg-background text-loss shadow-md transition-colors hover:bg-loss hover:text-white"
                              onClick={(event) => {
                                event.stopPropagation();
                                const label = tag.slice(CUSTOM_TAG_PREFIX.length);
                                const confirmed = window.confirm(
                                  `Vuoi eliminare il tag personalizzato "${label}"? Verrà rimosso anche dai trade salvati.`
                                );

                                if (!confirmed) {
                                  return;
                                }

                                onRemoveCustomTag(tag);
                                setTradeRows(previous =>
                                  previous.map(tradeRow => ({
                                    ...tradeRow,
                                    tags: tradeRow.tags.filter(
                                      value => value !== tag
                                    ),
                                  }))
                                );
                              }}
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 items-center gap-2 rounded-lg border border-border/70 bg-background/35 p-2 min-[430px]:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <Input
                      value={customTagInputs[row.id] ?? ''}
                      onChange={(event) =>
                        setCustomTagInputs((previous) => ({
                          ...previous,
                          [row.id]: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return;
                        }

                        event.preventDefault();
                        const label = customTagInputs[row.id]?.trim();

                        if (!label) {
                          return;
                        }

                        const value = `${CUSTOM_TAG_PREFIX}${label}`;

                        onAddCustomTag(value);

                        if (!row.tags.includes(value)) {
                          updateTradeRow(row.id, 'tags', [...row.tags, value]);
                        }

                        setCustomTagInputs((previous) => ({
                          ...previous,
                          [row.id]: '',
                        }));
                      }}
                      placeholder="Crea un tag personalizzato"
                      className="h-8 min-w-0 border-border/70 bg-background/60 font-mono text-[13px] placeholder:text-muted-foreground/60"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 font-mono text-xs"
                      disabled={!customTagInputs[row.id]?.trim()}
                      onClick={() => {
                        const label = customTagInputs[row.id]?.trim();

                        if (!label) {
                          return;
                        }

                        const value = `${CUSTOM_TAG_PREFIX}${label}`;

                        onAddCustomTag(value);

                        if (!row.tags.includes(value)) {
                          updateTradeRow(row.id, 'tags', [...row.tags, value]);
                        }

                        setCustomTagInputs((previous) => ({
                          ...previous,
                          [row.id]: '',
                        }));
                      }}
                    >
                      Aggiungi
                    </Button>
                    <Button
                      type="button"
                      variant={isManagingTags ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 px-3 font-mono text-xs"
                      disabled={customTags.length === 0}
                      onClick={() => setIsManagingTags(previous => !previous)}
                    >
                      Gestisci
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/30 p-3 sm:p-3.5">
                  <Label className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Note trade
                  </Label>

                  <Textarea
                    value={row.notes}
                    onChange={e => updateTradeRow(row.id, 'notes', e.target.value)}
                    placeholder="Cosa è successo in questo trade? Strategia, tag, lezioni..."
                    className="min-h-[72px] resize-y border-border bg-background text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-background/30 px-3 py-3 sm:gap-4 sm:px-4">
            <Button
              variant="outline"
              size="sm"
              onClick={addTradeRow}
              className="gap-2 border-border max-sm:w-full"
            >
              <Plus className="size-4" />
              Aggiungi trade
            </Button>

            <span className="min-w-0 break-words font-mono text-xs text-muted-foreground sm:text-sm">
              Trade: {tradeRows.length} | Totale giorno:{' '}
              <span className={cn(dayTotal > 0 && 'text-profit', dayTotal < 0 && 'text-loss')}>
                {streamerMode ? '******' : `${dayTotal.toFixed(2)} USD`}
              </span>
            </span>
          </div>

        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3.5 max-sm:[&_button]:w-full sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDayConfirmOpen(true)}
          >
            Elimina giorno
          </Button>

          <Button onClick={handleSalva} className="bg-profit text-background hover:bg-profit/90">
            Salva
          </Button>
        </div>
      </DialogContent>
      <Dialog
        open={Boolean(tradeToDeleteId)}
        onOpenChange={(open) => !open && setTradeToDeleteId(null)}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-[460px] border-border bg-card">
          <DialogHeader>
            <DialogTitle>Eliminare questo trade?</DialogTitle>
            <DialogDescription>
              Questa azione rimuoverà il trade selezionato dalla giornata. Non potrà essere recuperato se non tramite backup.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:[&_button]:w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTradeToDeleteId(null)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              className="bg-loss text-white hover:bg-loss/90"
              onClick={confirmRemoveTradeRow}
            >
              Elimina trade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteDayConfirmOpen}
        onOpenChange={setIsDeleteDayConfirmOpen}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-[460px] border-border bg-card">
          <DialogHeader>
            <DialogTitle>Eliminare questa giornata?</DialogTitle>
            <DialogDescription>
              Questa azione cancellerà tutti i trade e le informazioni salvate per questa giornata. Ti consigliamo di avere un backup prima di continuare.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:[&_button]:w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDayConfirmOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              className="bg-loss text-white hover:bg-loss/90"
              onClick={() => {
                setIsDeleteDayConfirmOpen(false);
                onDeleteDay();
              }}
            >
              Elimina giornata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TradeShareDialog
        open={Boolean(selectedShareTrade)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedShareTrade(null);
          }
        }}
        trade={selectedShareTrade}
        date={date}
        initialHandle={initialShareHandle}
      />
    </Dialog>
  );
}
