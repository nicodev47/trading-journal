'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScreenshotUpload } from './screenshot-upload';
import { TagInput } from './tag-input';
import {
  FOREX_PAIRS,
  EMOTIONAL_STATES,
  TRADE_MISTAKES,
  CUSTOM_MISTAKE_PREFIX,
  type Trade,
} from '@/lib/types/trade';
import {
  calculatePips,
  calculatePnL,
  calculateRiskReward,
  generateId,
} from '@/lib/calculations';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

interface TradeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  onDelete?: (id: string) => void;
  initialDate?: string;
  existingTrade?: Trade;
  availableTags: string[];
  availableStrategies: string[];
  customMistakes?: string[];
  onAddTag: (tag: string) => void;
  onAddStrategy: (strategy: string) => void;
  onAddCustomMistake?: (mistake: string) => void;
}

const defaultTrade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'> = {
  pair: 'EUR/USD',
  direction: 'long',
  entryPrice: 0,
  exitPrice: 0,
  lotSize: 0.01,
  stopLoss: 0,
  takeProfit: 0,
  entryDate: '',
  exitDate: '',
  pips: 0,
  pnl: 0,
  commission: 0,
  riskReward: 0,
  screenshots: [],
  tags: [],
  mistakes: [],
  isFavorite: false,
  strategy: '',
  notes: '',
  emotionalState: 'neutral',
  setupRating: 3,
};

export function TradeForm({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate,
  existingTrade,
  availableTags,
  availableStrategies,
  customMistakes = [],
  onAddTag,
  onAddStrategy,
  onAddCustomMistake,
}: TradeFormProps) {
  const { streamerMode } = useStreamerMode();
  const [trade, setTrade] = useState(defaultTrade);
  const [activeTab, setActiveTab] = useState('details');
  const [customMistakeInput, setCustomMistakeInput] = useState('');

  useEffect(() => {
    setCustomMistakeInput('');

    if (existingTrade) {
      setTrade({
  ...existingTrade,
  mistakes: existingTrade.mistakes || [],
  isFavorite: existingTrade.isFavorite ?? false,
});
    } else if (initialDate) {
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setTrade({
        ...defaultTrade,
        entryDate: `${initialDate}T${time}`,
        exitDate: `${initialDate}T${time}`,
      });
    }
  }, [existingTrade, initialDate, isOpen]);

  // Auto-calculate pips, P&L, and R:R
  useEffect(() => {
    if (trade.entryPrice > 0 && trade.exitPrice > 0) {
      const pips = calculatePips(
        trade.pair,
        trade.entryPrice,
        trade.exitPrice,
        trade.direction
      );
      const pnl = calculatePnL(trade.pair, pips, trade.lotSize);
      const riskReward = calculateRiskReward(pips, trade.stopLoss);

      setTrade(prev => ({
        ...prev,
        pips: Math.round(pips * 10) / 10,
        pnl: Math.round(pnl * 100) / 100,
        riskReward: Math.round(riskReward * 100) / 100,
      }));
    }
  }, [trade.entryPrice, trade.exitPrice, trade.pair, trade.direction, trade.lotSize, trade.stopLoss]);

  const handleSave = () => {
    const now = new Date().toISOString();
    const customMistake = customMistakeInput.trim();
    const pendingCustomMistake = customMistake
      ? `${CUSTOM_MISTAKE_PREFIX}${customMistake}`
      : null;
    if (pendingCustomMistake) {
      onAddCustomMistake?.(pendingCustomMistake);
    }
    const mistakes =
      pendingCustomMistake && !trade.mistakes.includes(pendingCustomMistake)
        ? [...trade.mistakes, pendingCustomMistake]
        : trade.mistakes;
    const savedTrade: Trade = {
      ...trade,
      mistakes,
      id: existingTrade?.id || generateId(),
      createdAt: existingTrade?.createdAt || now,
      updatedAt: now,
    };
    onSave(savedTrade);
    onClose();
    setTrade(defaultTrade);
    setCustomMistakeInput('');
    setActiveTab('details');
  };

  const handleDelete = () => {
    if (existingTrade && onDelete) {
      onDelete(existingTrade.id);
      onClose();
    }
  };

  const updateField = <K extends keyof typeof trade>(
    field: K,
    value: (typeof trade)[K]
  ) => {
    setTrade(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {existingTrade ? 'Edit Trade' : 'New Trade'}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            {/* Pair and Direction */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pair">Currency Pair</Label>
                <Select
                  value={trade.pair}
                  onValueChange={(v) => updateField('pair', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {FOREX_PAIRS.map(pair => (
                        <SelectItem key={pair} value={pair}>
                          {pair}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <Select
                  value={trade.direction}
                  onValueChange={(v) => updateField('direction', v as 'long' | 'short')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="long">Long (Buy)</SelectItem>
                      <SelectItem value="short">Short (Sell)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Entry and Exit Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryPrice">Entry Price</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="0.00001"
                  value={trade.entryPrice || ''}
                  onChange={(e) => updateField('entryPrice', parseFloat(e.target.value) || 0)}
                  placeholder="1.10000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exitPrice">Exit Price</Label>
                <Input
                  id="exitPrice"
                  type="number"
                  step="0.00001"
                  value={trade.exitPrice || ''}
                  onChange={(e) => updateField('exitPrice', parseFloat(e.target.value) || 0)}
                  placeholder="1.10500"
                />
              </div>
            </div>

            {/* Lot Size */}
            <div className="space-y-2">
              <Label htmlFor="lotSize">Lot Size</Label>
              <Input
                id="lotSize"
                type="number"
                step="0.01"
                value={trade.lotSize || ''}
                onChange={(e) => updateField('lotSize', parseFloat(e.target.value) || 0)}
                placeholder="0.01"
              />
            </div>

            {/* SL and TP in pips */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stopLoss">Stop Loss (pips)</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  step="0.1"
                  value={trade.stopLoss || ''}
                  onChange={(e) => updateField('stopLoss', parseFloat(e.target.value) || 0)}
                  placeholder="20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="takeProfit">Take Profit (pips)</Label>
                <Input
                  id="takeProfit"
                  type="number"
                  step="0.1"
                  value={trade.takeProfit || ''}
                  onChange={(e) => updateField('takeProfit', parseFloat(e.target.value) || 0)}
                  placeholder="40"
                />
              </div>
            </div>

            {/* Entry and Exit DateTime */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryDate">Entry Date/Time</Label>
                <Input
                  id="entryDate"
                  type="datetime-local"
                  value={trade.entryDate}
                  onChange={(e) => updateField('entryDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exitDate">Exit Date/Time</Label>
                <Input
                  id="exitDate"
                  type="datetime-local"
                  value={trade.exitDate}
                  onChange={(e) => updateField('exitDate', e.target.value)}
                />
              </div>
            </div>

            {/* Commission */}
            <div className="space-y-2">
              <Label htmlFor="commission">Commission/Fees ($)</Label>
              <Input
                id="commission"
                type="number"
                step="0.01"
                value={trade.commission || ''}
                onChange={(e) => updateField('commission', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            {/* Auto-calculated fields display */}
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <h4 className="mb-3 text-sm font-medium">Calculated Results</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Pips</p>
                  <p className={cn(
                    'font-mono text-lg font-semibold',
                    trade.pips > 0 && 'text-profit',
                    trade.pips < 0 && 'text-loss'
                  )}>
                    {streamerMode
                      ? '******'
                      : `${trade.pips >= 0 ? '+' : ''}${trade.pips}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">P&L</p>
                  <p className={cn(
                    'font-mono text-lg font-semibold',
                    trade.pnl > 0 && 'text-profit',
                    trade.pnl < 0 && 'text-loss'
                  )}>
                    {streamerMode
                      ? '******'
                      : `$${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">R:R</p>
                  <p className="font-mono text-lg font-semibold">
                    {trade.riskReward.toFixed(2)}R
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="mt-4 space-y-4">
            {/* Strategy */}
            <div className="space-y-2">
              <Label>Strategy</Label>
              <Select
                value={trade.strategy}
                onValueChange={(v) => updateField('strategy', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availableStrategies.map(strategy => (
                      <SelectItem key={strategy} value={strategy}>
                        {strategy}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <TagInput
                selectedTags={trade.tags}
                availableTags={availableTags}
                onChange={(tags) => updateField('tags', tags)}
                onAddNew={onAddTag}
              />
            </div>

            <div className="space-y-2">
              <Label>Errori</Label>

              <div className="grid grid-cols-2 gap-2">
                {TRADE_MISTAKES.map((mistake) => {
                  const isSelected = trade.mistakes.includes(mistake.value);

                  return (
                    <button
                      key={mistake.value}
                      type="button"
                      onClick={() => {
                        const nextMistakes = isSelected
                          ? trade.mistakes.filter((m) => m !== mistake.value)
                          : [...trade.mistakes, mistake.value];

                        updateField('mistakes', nextMistakes);
                      }}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left font-mono text-[11px] transition-colors',
                        isSelected
                          ? 'border-loss/50 bg-loss/10 text-loss'
                          : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                      )}
                    >
                      <span className="mr-2" aria-hidden="true">
                        {mistake.emoji}
                      </span>
                      {mistake.label}
                    </button>
                  );
                })}

                {Array.from(
                  new Set([
                    ...customMistakes,
                    ...trade.mistakes.filter((mistake) =>
                      mistake.startsWith(CUSTOM_MISTAKE_PREFIX)
                    ),
                  ])
                ).map((mistake) => {
                  const isSelected = trade.mistakes.includes(mistake);

                  return (
                    <button
                      key={mistake}
                      type="button"
                      onClick={() => {
                        const nextMistakes = isSelected
                          ? trade.mistakes.filter((value) => value !== mistake)
                          : [...trade.mistakes, mistake];

                        updateField('mistakes', nextMistakes);
                      }}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left font-mono text-[11px] transition-colors',
                        isSelected
                          ? 'border-loss/50 bg-loss/10 text-loss'
                          : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                    )}
                  >
                      {mistake.slice(CUSTOM_MISTAKE_PREFIX.length)}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Input
                  value={customMistakeInput}
                  onChange={(event) => setCustomMistakeInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') {
                      return;
                    }

                    event.preventDefault();
                    const label = customMistakeInput.trim();

                    if (!label) {
                      return;
                    }

                    const value = `${CUSTOM_MISTAKE_PREFIX}${label}`;

                    onAddCustomMistake?.(value);

                    if (!trade.mistakes.includes(value)) {
                      updateField('mistakes', [...trade.mistakes, value]);
                    }

                    setCustomMistakeInput('');
                  }}
                  placeholder="✏️ Crea un errore personalizzato"
                  className="h-8 font-mono text-[11px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 font-mono text-[11px]"
                  disabled={!customMistakeInput.trim()}
                  onClick={() => {
                    const value = `${CUSTOM_MISTAKE_PREFIX}${customMistakeInput.trim()}`;

                    onAddCustomMistake?.(value);

                    if (!trade.mistakes.includes(value)) {
                      updateField('mistakes', [...trade.mistakes, value]);
                    }

                    setCustomMistakeInput('');
                  }}
                >
                  Aggiungi
                </Button>
              </div>
            </div>

            {/* Emotional State */}
            <div className="space-y-2">
              <Label>Emotional State</Label>
              <Select
                value={trade.emotionalState}
                onValueChange={(v) => updateField('emotionalState', v as Trade['emotionalState'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {EMOTIONAL_STATES.map(state => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Setup Rating */}
            <div className="space-y-2">
              <Label>Setup Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => updateField('setupRating', rating)}
                    className="p-1"
                  >
                    <Star
                      className={cn(
                        'size-6 transition-colors',
                        rating <= trade.setupRating
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-muted-foreground'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes & Lessons Learned</Label>
              <Textarea
                id="notes"
                value={trade.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="What did you learn from this trade? What could you have done better?"
                rows={5}
              />
            </div>
          </TabsContent>

          <TabsContent value="media" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Screenshots</Label>
              <p className="text-xs text-muted-foreground">
                Upload chart screenshots to document your trade setup and execution.
              </p>
             <ScreenshotUpload
  screenshots={trade.screenshots.filter(
    (s): s is string => typeof s === 'string'
  )}
  onChange={(screenshots) => updateField('screenshots', screenshots)}
/>
            </div>
          </TabsContent>
        </Tabs>

        <SheetFooter className="mt-6 flex gap-2">
          {existingTrade && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {existingTrade ? 'Update' : 'Save'} Trade
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
