'use client';

import {
  CUSTOM_EMOTION_PREFIX,
  TRADE_EMOTIONS,
  emotionColorKey,
  getEmotion,
} from '@/lib/trade-emotions';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CUSTOM_TAG_PREFIX,
  TRADE_TAGS,
  getEditableSetupValue,
  type Trade,
  type ScreenshotData,
} from '@/lib/types/trade';
import { generateId } from '@/lib/calculations';
import {
  MAX_IMAGES_PER_TRADE,
  isDataImage,
  openImageInNewTab,
} from '@/lib/image-upload';
import { toast } from 'sonner';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { usePreferences } from '@/contexts/preferences-context';
import { getMenuOptions } from '@/lib/preferences';
import { PROFILE_NAME_KEY } from '@/lib/export-filename';
import {
  DEFAULT_TAG_COLOR,
  getTagColor,
  TAG_COLOR_PALETTE,
} from '@/lib/tag-colors';
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
  emotions: string[];
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

  if (isNegative) return `-${unsignedValue}`;

  // A positive number gets its "+" straight away (zero stays plain).
  const isZero = /^0*(,0*)?$/.test(unsignedValue);

  return unsignedValue === '' || isZero ? unsignedValue : `+${unsignedValue}`;
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

const DRIVE_HINT_KEY = 'eclipsejournal-drive-hint-seen';
const DRIVE_VIDEO_URL = 'https://youtu.be/PlQxrZgdHJ0';

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

function resizeNotesTextarea(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
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
  isTutorialMode?: boolean;
  /** Shows the day without any way to change it (import preview). */
  readOnly?: boolean;
  onClose: () => void;
  date: string;
  existingTrades: Trade[];
  onSave: (trades: Trade[]) => void;
  onDeleteDay: () => void;
  strategies: string[];
  availableStandardTags: string[];
  customTags: string[];
  tagColors: Record<string, string>;
  onAddStrategy: (strategy: string) => void;
  onRemoveStrategy: (strategy: string) => void;
  onAddCustomTag: (tag: string) => void;
  onUpdateTagColor: (tag: string, color: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function DayEditorDialog({
  isOpen,
  isTutorialMode = false,
  readOnly = false,
  onClose,
  date,
  existingTrades,
  onSave,
  onDeleteDay,
  availableStandardTags = [],
  customTags = [],
  tagColors,
  onAddCustomTag,
  onUpdateTagColor,
  onRemoveTag,
}: DayEditorDialogProps) {
  const { preferences, updatePreferences } = usePreferences();
  const emotionPrefs = preferences.emotions ?? { hidden: [], custom: [], colors: {} };
  const presetEmotions = TRADE_EMOTIONS.filter(item => !emotionPrefs.hidden.includes(item.value));
  const canManageEmotions = presetEmotions.length > 0 || emotionPrefs.custom.length > 0;
  const setEmotionColor = (value: string, color: string) =>
    updatePreferences({
      emotions: {
        ...emotionPrefs,
        colors: { ...emotionPrefs.colors, [emotionColorKey(value)]: color },
      },
    });
  const { streamerMode } = useStreamerMode();
  const [tradeRows, setTradeRows] = useState<TradeRow[]>([]);
  const [timeDrafts, setTimeDrafts] = useState<Record<string, string>>({});
  const [screenshotInputs, setScreenshotInputs] = useState<Record<string, { url: string; name: string }>>({});
  const [customTagInputs, setCustomTagInputs] = useState<Record<string, string>>({});
  const [customTagColors, setCustomTagColors] = useState<Record<string, string>>({});
  const [isManagingTags, setIsManagingTags] = useState(false);
  const [managedTagKey, setManagedTagKey] = useState<string | null>(null);
  const [tradeToDeleteId, setTradeToDeleteId] = useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  // First time the trade window opens: points at the timeframe/link section.
  const [driveHintOpen, setDriveHintOpen] = useState(false);
  const driveHintShownRef = useRef(false);
  const markDriveHintSeen = useCallback(() => {
    setDriveHintOpen(false);
    driveHintShownRef.current = false;

    try {
      localStorage.setItem(DRIVE_HINT_KEY, 'true');
    } catch {
      // Without storage the hint simply shows again next time.
    }
  }, []);
  const [emotionToDelete, setEmotionToDelete] = useState<string | null>(null);
  const [isManagingEmotions, setIsManagingEmotions] = useState(false);
  const [managedEmotionKey, setManagedEmotionKey] = useState<string | null>(null);
  const [customEmotionInputs, setCustomEmotionInputs] = useState<Record<string, string>>({});
  const [customEmotionColors, setCustomEmotionColors] = useState<Record<string, string>>({});
  const [screenshotToDelete, setScreenshotToDelete] = useState<{
    tradeId: string;
    index: number;
  } | null>(null);
  const [isDeleteDayConfirmOpen, setIsDeleteDayConfirmOpen] = useState(false);
  const [selectedShareTrade, setSelectedShareTrade] = useState<Trade | null>(null);
  const [editingScreenshot, setEditingScreenshot] = useState<{
    tradeId: string;
    index: number;
    name: string;
  } | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const tradeRowsRef = useRef<TradeRow[]>([]);
  const timeDraftsRef = useRef<Record<string, string>>({});
  const customTagInputsRef = useRef<Record<string, string>>({});
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSignatureRef = useRef('');
  const hasUserChangedRef = useRef(false);
  const initialTradeIdsRef = useRef<Set<string>>(new Set());
  const existingTradesByIdRef = useRef<Map<string, Trade>>(new Map());
  const isOpenRef = useRef(isOpen);
  const availablePresetTags = useMemo(
    () =>
      availableStandardTags
        .map((tagValue) => TRADE_TAGS.find((tag) => tag.value === tagValue))
        .filter((tag): tag is (typeof TRADE_TAGS)[number] => Boolean(tag)),
    [availableStandardTags]
  );
  const canManageTags = availablePresetTags.length > 0 || customTags.length > 0;

  const createEmptyRow = (): TradeRow => ({
    id: generateId(),
    pnl: '',
    symbol: '',
    direction: '',
    time: '00:00',
    setup: '',
    originalSetup: '',
    tags: [],
    emotions: [],
    isFavorite: false,
    screenshots: [],
    notes: '',
  });

  const normalizeScreenshots = (screenshots: Trade['screenshots']): ScreenshotData[] =>
    (screenshots || []).map(s => {
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
    });

  const getRowsFromTrades = (trades: Trade[]): TradeRow[] =>
    trades.map(t => {
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
        // FOMO used to be a tag: it now lives with the emotions.
        tags: (t.tags?.length ? t.tags : legacyTrade.mistakes ?? []).filter(tag => tag !== 'fomo'),
        emotions: Array.from(
          new Set([...(t.emotions ?? []), ...((t.tags ?? []).includes('fomo') ? ['fomo'] : [])])
        ),
        isFavorite: t.isFavorite ?? false,
        screenshots: normalizeScreenshots(t.screenshots),
        notes: t.notes || '',
      };
    });

  const rowHasContent = useCallback((row: TradeRow): boolean => {
    return (
      initialTradeIdsRef.current.has(row.id) ||
      row.pnl !== '' ||
      row.symbol.trim() !== '' ||
      row.direction !== '' ||
      row.time !== '00:00' ||
      row.setup !== '' ||
      row.tags.length > 0 ||
      row.emotions.length > 0 ||
      row.isFavorite ||
      row.screenshots.length > 0 ||
      row.notes.trim() !== ''
    );
  }, []);

  const buildTradesFromRows = useCallback((
    rows: TradeRow[],
    drafts: Record<string, string>,
    tagInputs: Record<string, string>,
    options: { includePendingCustomTags?: boolean } = {}
  ): Trade[] => {
    const now = new Date().toISOString();

    return rows
      .filter(row => rowHasContent(row))
      .map(row => {
        const customTag = options.includePendingCustomTags
          ? tagInputs[row.id]?.trim()
          : '';
        const pendingCustomTag = customTag
          ? `${CUSTOM_TAG_PREFIX}${customTag}`
          : null;
        const tags =
          pendingCustomTag && !row.tags.includes(pendingCustomTag)
            ? [...row.tags, pendingCustomTag]
            : row.tags;
        const tradeTime = normalizeTime(drafts[row.id] ?? row.time);
        const existingTrade = existingTradesByIdRef.current.get(row.id);

        return {
          id: row.id,
          pair: row.symbol || '',
          direction: row.direction,
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
          emotions: row.emotions,
          isFavorite: row.isFavorite,
          strategy: row.setup || row.originalSetup,
          notes: row.notes,
          emotionalState: 'neutral' as const,
          setupRating: 3,
          createdAt: existingTrade?.createdAt || now,
          updatedAt: now,
        };
      });
  }, [date, rowHasContent]);

  const getAutosaveSignature = (trades: Trade[]) =>
    JSON.stringify(
      trades.map(({ createdAt, updatedAt, ...trade }) => trade)
    );

  const persistCurrentRows = useCallback((
    options: { includePendingCustomTags?: boolean; force?: boolean } = {}
  ) => {
    if (readOnly || !isOpenRef.current) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const trades = buildTradesFromRows(
      tradeRowsRef.current,
      timeDraftsRef.current,
      customTagInputsRef.current,
      options
    );
    const signature = getAutosaveSignature(trades);

    if (!options.force && signature === lastSavedSignatureRef.current) {
      setAutosaveStatus(signature ? 'saved' : 'idle');
      return;
    }

    setAutosaveStatus('saving');
    onSave(trades);
    existingTradesByIdRef.current = new Map(trades.map(trade => [trade.id, trade]));
    lastSavedSignatureRef.current = signature;
    setAutosaveStatus(signature ? 'saved' : 'idle');
  }, [buildTradesFromRows, onSave, readOnly]);

  const scheduleAutosave = useCallback((delay = 400) => {
    if (!isOpenRef.current || !hasUserChangedRef.current) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    setAutosaveStatus('saving');
    autosaveTimerRef.current = setTimeout(() => {
      persistCurrentRows();
    }, delay);
  }, [persistCurrentRows]);

  const replaceTradeRows = (
    updater: (previous: TradeRow[]) => TradeRow[],
    delay = 400
  ) => {
    hasUserChangedRef.current = true;
    setTradeRows(previous => {
      const next = updater(previous);
      tradeRowsRef.current = next;
      return next;
    });
    scheduleAutosave(delay);
  };

  const replaceTimeDrafts = (
    updater: (previous: Record<string, string>) => Record<string, string>,
    delay = 400
  ) => {
    hasUserChangedRef.current = true;
    setTimeDrafts(previous => {
      const next = updater(previous);
      timeDraftsRef.current = next;
      return next;
    });
    scheduleAutosave(delay);
  };

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    tradeRowsRef.current = tradeRows;
  }, [tradeRows]);

  useEffect(() => {
    timeDraftsRef.current = timeDrafts;
  }, [timeDrafts]);

  useEffect(() => {
    customTagInputsRef.current = customTagInputs;
  }, [customTagInputs]);

  useEffect(() => {
    if (!isOpen) return;

    const initialRows =
      existingTrades.length > 0 ? getRowsFromTrades(existingTrades) : [createEmptyRow()];

    initialTradeIdsRef.current = new Set(existingTrades.map(trade => trade.id));
    existingTradesByIdRef.current = new Map(existingTrades.map(trade => [trade.id, trade]));
    const initialSignature = getAutosaveSignature(
      buildTradesFromRows(initialRows, {}, {}, { includePendingCustomTags: false })
    );
    tradeRowsRef.current = initialRows;
    timeDraftsRef.current = {};
    customTagInputsRef.current = {};
    lastSavedSignatureRef.current = initialSignature;
    hasUserChangedRef.current = false;

    setTradeRows(initialRows);
    setScreenshotInputs({});
    setTimeDrafts({});
    setCustomTagInputs({});
    setCustomTagColors({});
    setIsManagingTags(false);
    setManagedTagKey(null);
    setEditingScreenshot(null);
    setTagToDelete(null);
    setAutosaveStatus(initialSignature ? 'saved' : 'idle');

    return () => {
      if (autosaveTimerRef.current) {
        persistCurrentRows();
      }
    };
  }, [isOpen, date]);

  const addTradeRow = () => {
    replaceTradeRows(prev => [...prev, createEmptyRow()], 0);
  };

  const removeTradeRow = (id: string) => {
    if (tradeRows.length > 1) {
      replaceTradeRows(prev => prev.filter(row => row.id !== id), 0);
    }
  };

  const confirmRemoveTradeRow = () => {
    if (tradeToDeleteId) {
      removeTradeRow(tradeToDeleteId);
      setTradeToDeleteId(null);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      // Closing the window counts as having seen the hint.
      if (driveHintShownRef.current) markDriveHintSeen();

      return;
    }

    if (isTutorialMode || readOnly) return;

    try {
      if (localStorage.getItem(DRIVE_HINT_KEY) === 'true') return;
    } catch {
      return;
    }

    driveHintShownRef.current = true;
    setDriveHintOpen(true);
  }, [isOpen, isTutorialMode, readOnly, markDriveHintSeen]);

  useEffect(() => {
    if (!driveHintOpen) return;

    const timer = window.setTimeout(() => {
      document.getElementById('drive-hint-target')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [driveHintOpen]);

  const confirmRemoveEmotion = () => {
    if (!emotionToDelete) return;

    const removed = emotionToDelete;
    const isCustom = removed.startsWith(CUSTOM_EMOTION_PREFIX);

    updatePreferences({
      emotions: {
        hidden: isCustom ? emotionPrefs.hidden : [...emotionPrefs.hidden, removed],
        custom: emotionPrefs.custom.filter(value => value !== removed),
        colors: emotionPrefs.colors,
      },
    });
    replaceTradeRows(
      previous =>
        previous.map(tradeRow => ({
          ...tradeRow,
          emotions: tradeRow.emotions.filter(value => value !== removed),
        })),
      0
    );
    setManagedEmotionKey(null);
    setEmotionToDelete(null);
  };

  const addCustomEmotion = (rowId: string, current: string[]) => {
    const label = customEmotionInputs[rowId]?.trim();

    if (!label) return;

    const value = `${CUSTOM_EMOTION_PREFIX}${label}`;

    updatePreferences({
      emotions: {
        ...emotionPrefs,
        custom: emotionPrefs.custom.includes(value) ? emotionPrefs.custom : [...emotionPrefs.custom, value],
        colors: {
          ...emotionPrefs.colors,
          [emotionColorKey(value)]: customEmotionColors[rowId] ?? DEFAULT_TAG_COLOR,
        },
      },
    });

    if (!current.includes(value)) updateTradeRow(rowId, 'emotions', [...current, value], 0);

    setCustomEmotionInputs(previous => ({ ...previous, [rowId]: '' }));
    setCustomEmotionColors(previous => ({ ...previous, [rowId]: DEFAULT_TAG_COLOR }));
  };

  const confirmRemoveTag = () => {
    if (!tagToDelete) return;

    onRemoveTag(tagToDelete);
    replaceTradeRows(
      previous =>
        previous.map(tradeRow => ({
          ...tradeRow,
          tags: tradeRow.tags.filter(value => value !== tagToDelete),
        })),
      0
    );
    setTagToDelete(null);
  };

  const updateTradeRow = (
    id: string,
    field: keyof TradeRow,
    value: string | boolean | string[] | ScreenshotData[],
    delay = 400
  ) => {
    replaceTradeRows(
      prev => prev.map(row => (row.id === id ? { ...row, [field]: value } : row)),
      delay
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

    updateTradeRow(tradeId, 'screenshots', [...trade.screenshots, newScreenshot], 0);
    setScreenshotInputs(prev => ({ ...prev, [tradeId]: { url: '', name: '' } }));
  };

  const removeScreenshotFromTrade = (tradeId: string, index: number) => {
    const trade = tradeRows.find(r => r.id === tradeId);

    if (trade) {
      updateTradeRow(
        tradeId,
        'screenshots',
        trade.screenshots.filter((_, i) => i !== index),
        0
      );
    }
  };

  const confirmRemoveScreenshot = () => {
    if (screenshotToDelete) {
      removeScreenshotFromTrade(screenshotToDelete.tradeId, screenshotToDelete.index);
      if (
        editingScreenshot?.tradeId === screenshotToDelete.tradeId &&
        editingScreenshot.index === screenshotToDelete.index
      ) {
        setEditingScreenshot(null);
      }
      setScreenshotToDelete(null);
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

    updateTradeRow(trade.id, 'screenshots', screenshots, 0);
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
      direction: row.direction,
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
      emotions: row.emotions,
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
    Object.entries(customTagInputs).forEach(([rowId, input]) => {
      const label = input.trim();

      if (label) {
        const value = `${CUSTOM_TAG_PREFIX}${label}`;
        onAddCustomTag(value);
        onUpdateTagColor(
          value,
          customTagColors[rowId] ?? DEFAULT_TAG_COLOR
        );
      }
    });

    persistCurrentRows({ includePendingCustomTags: true, force: true });
    onClose();
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && isTutorialMode) return;

    if (!open) {
      persistCurrentRows();
      onClose();
    }
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
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-4xl gap-0 overflow-hidden bg-card p-0 sm:w-[92vw] sm:max-h-[86vh]"
        data-tutorial="trade-editor"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (isTutorialMode || editingScreenshot) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isTutorialMode) event.preventDefault();
        }}
      >
        <DialogHeader className="border-b border-border px-4 py-3.5 text-left sm:px-6 sm:py-4">
          <DialogTitle className="font-sans tabular-nums text-base font-medium tracking-wide">
            {formatDialogDate(date)}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Aggiungi P&L, simbolo, direzione, orario, setup e screenshot per ogni trade.
          </DialogDescription>
        </DialogHeader>

        <div className="ej-scrollbar flex max-h-[calc(92dvh-116px)] flex-col gap-3 overflow-y-auto overscroll-contain p-3 sm:max-h-[calc(86vh-120px)] sm:gap-4 sm:p-4">
          <fieldset
            disabled={readOnly}
            className="contents [&_:disabled]:!cursor-default [&_:disabled]:!opacity-100"
          >
          <div className="flex flex-col gap-3 sm:gap-4">
            {tradeRows.map((row, rowIndex) => (
              <div
                key={row.id}
                className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-border bg-secondary/15 p-3 sm:gap-3.5 sm:p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-sans tabular-nums text-xs font-medium text-muted-foreground">
                    Trade {rowIndex + 1}
                  </span>

                  <div className="flex items-center gap-2">
                    {!readOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 gap-2 rounded-lg border border-[#6cb6ff]/55 bg-[#0a84ff]/15 px-3.5 font-sans text-sm font-medium text-foreground shadow-none transition-colors duration-150 hover:border-[#8cc7ff]/70 hover:bg-[#0a84ff]/25 hover:text-foreground hover:shadow-none dark:border-[#6cb6ff]/55 dark:bg-[#0a84ff]/15 dark:hover:border-[#8cc7ff]/70 dark:hover:bg-[#0a84ff]/25 dark:hover:text-foreground"
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
                    )}

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
                        updateTradeRow(row.id, 'isFavorite', !row.isFavorite, 0)
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

                    {!readOnly && (
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
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-background/30 p-3 sm:p-3.5">
                  <p className="mb-3 font-sans tabular-nums text-[11px] font-medium tracking-normal text-muted-foreground">
                    Dettagli trade
                  </p>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_120px_130px_120px_minmax(220px,1fr)]">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium tracking-normalr text-muted-foreground">
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
                        onBlur={() => persistCurrentRows()}
                        placeholder="0"
                        className={cn(
                          'h-9 w-full border-border/70 bg-background/60 pr-7 font-sans tabular-nums text-sm',
                          getPnlNumber(row.pnl) > 0 && 'text-profit',
                          getPnlNumber(row.pnl) < 0 && 'text-loss'
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
                    <Label className="text-xs font-medium tracking-normalr text-muted-foreground">
                      Simbolo
                    </Label>

                    <Select
                      value={row.symbol}
                      onValueChange={v => updateTradeRow(row.id, 'symbol', v, 0)}
                    >
                      <SelectTrigger className="h-9 w-full border-border/70 bg-background/60 text-sm data-[size=default]:h-9">
                        <SelectValue placeholder="--" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectGroup>
                          {getMenuOptions(preferences.assets, row.symbol).map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.value}
                              {option.orphan ? ' (non più nelle preferenze)' : ''}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium tracking-normalr text-muted-foreground">
                      Direzione
                    </Label>

                    <Select
                      value={row.direction}
                      onValueChange={v => updateTradeRow(row.id, 'direction', v, 0)}
                    >
                      <SelectTrigger className="h-9 w-full border-border/70 bg-background/60 text-sm data-[size=default]:h-9">
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
                    <Label className="text-xs font-medium tracking-normalr text-muted-foreground">
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
                            replaceTimeDrafts(prev => ({
                              ...prev,
                              [row.id]: event.key,
                            }));
                          }
                        }}
                        onChange={(e) => {
                          const draft = formatTimeDraft(e.target.value);

                          replaceTimeDrafts(prev => ({ ...prev, [row.id]: draft }));
                        }}
                        onBlur={() => {
                          const normalized = normalizeTime(
                            timeDrafts[row.id] ?? row.time
                          );

                          updateTradeRow(row.id, 'time', normalized, 0);
                          replaceTimeDrafts(prev => ({
                            ...prev,
                            [row.id]: normalized,
                          }), 0);
                          persistCurrentRows();
                        }}
                        className={cn(
                          'h-9 w-full border-border/70 bg-background/60 text-center font-sans tabular-nums text-sm placeholder:text-muted-foreground/70',
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
                    <Label className="text-xs font-medium tracking-normalr text-muted-foreground">
                      Setup
                    </Label>

                    <Select
                      value={row.setup}
                      onValueChange={value =>
                        updateTradeRow(row.id, 'setup', value, 0)
                      }
                    >
                      <SelectTrigger className="h-9 w-full border-border/70 bg-background/60 text-sm data-[size=default]:h-9">
                        <SelectValue placeholder="Seleziona setup" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectGroup>
                          {getMenuOptions(preferences.setups, row.setup).map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.value}
                              {option.orphan ? ' (non più nelle preferenze)' : ''}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                </div>
                <div
                  id={rowIndex === 0 ? 'drive-hint-target' : undefined}
                  className={cn(
                    'flex min-w-0 flex-col gap-3 rounded-lg border border-border/70 bg-background/30 p-3 transition-shadow sm:p-3.5',
                    driveHintOpen && rowIndex === 0 && 'border-white/60 shadow-[0_0_0_3px_rgba(255,255,255,0.12)]'
                  )}
                >
                  <p className="font-sans tabular-nums text-[11px] font-medium tracking-normal text-muted-foreground">
                    Analisi trade
                  </p>

                  {driveHintOpen && rowIndex === 0 && (
                    <div className="flex flex-col gap-2.5 rounded-lg border border-white/25 bg-white/[0.07] p-3">
                      <p className="font-sans text-sm font-semibold text-foreground">
                        Come aggiungere le immagini dei tuoi trade
                      </p>
                      <ol className="list-decimal space-y-1 pl-4 font-sans text-xs leading-relaxed text-muted-foreground">
                        <li>Scrivi il timeframe del grafico (per esempio 5m).</li>
                        <li>Carica lo screenshot in una cartella su Google Drive, imposta la visualizzazione su “Chiunque abbia il link” e copia il link di condivisione dell’immagine.</li>
                        <li>Incolla il link qui sotto e premi “Aggiungi”.</li>
                      </ol>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={DRIVE_VIDEO_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={markDriveHintSeen}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 font-sans text-xs font-semibold text-foreground transition-colors hover:bg-white/10"
                        >
                          <Play className="size-3.5" />
                          Guarda il video
                        </a>
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 bg-white text-black hover:bg-white/90"
                          onClick={markDriveHintSeen}
                        >
                          Ho capito
                        </Button>
                      </div>
                    </div>
                  )}

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
                                  className="h-8 min-w-0 flex-1 border-border/70 bg-background/60 font-sans tabular-nums text-xs"
                                />
                              ) : (
                                <span className="min-w-0 truncate font-sans tabular-nums text-xs font-medium text-foreground">
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
                                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-profit/20 bg-profit/5 px-2 font-sans tabular-nums text-[10px] text-muted-foreground transition-colors hover:border-highlight/40 hover:bg-primary/10 hover:text-highlight"
                                    >
                                      <Check className="size-3" />
                                      Salva
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingScreenshot(null)}
                                      aria-label="Annulla modifica nome link"
                                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background/70 px-2 font-sans tabular-nums text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
                                    className="rounded-lg border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-highlight/30 hover:bg-primary/10 hover:text-highlight"
                                  >
                                    <Pencil className="size-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setScreenshotToDelete({ tradeId: row.id, index })
                                  }
                                  aria-label="Elimina link"
                                  className="rounded-lg border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
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
                                onClick={event => {
                                  if (isDataImage(screenshot.url)) {
                                    event.preventDefault();
                                    void openImageInNewTab(screenshot.url);
                                  }
                                }}
                                className="flex items-center gap-1 text-foreground hover:text-highlight"
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
                        className="h-8 border-border/70 bg-background/60 text-sm"
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
                        placeholder="Inserisci il link di TradingView"
                        className="h-8 border-border/70 bg-background/60 text-sm"
                        onKeyDown={e => e.key === 'Enter' && addScreenshotToTrade(row.id)}
                      />

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addScreenshotToTrade(row.id)}
                        className="h-8 shrink-0 gap-1.5 border-border text-xs"
                        disabled={
                          !screenshotInputs[row.id]?.url?.trim() ||
                          row.screenshots.length >= MAX_IMAGES_PER_TRADE
                        }
                      >
                        <Plus className="size-3" />
                        Aggiungi
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Incolla il link di TradingView / Google Drive e premi “Aggiungi”
                    </p>

                    {screenshotInputs[row.id]?.url?.trim() && (
                      <div className="overflow-hidden rounded-lg border border-border bg-background">
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
                          
                            className="flex items-center gap-1 text-foreground hover:text-highlight"
                          >
                            Apri <ExternalLink className="size-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-border/70 bg-background/30 p-3 sm:p-3.5">
                  <Label className="text-[11px] font-medium tracking-normal text-muted-foreground">
                    TAGS
                  </Label>

                  <div className="flex flex-wrap gap-2">
                    {availablePresetTags.map((tag) => {
                      const isSelected = row.tags.includes(tag.value);
                      const tagColor = getTagColor(tag.value, tagColors);
                      const tagManagementKey = `${row.id}:${tag.value}`;
                      const isManaged = managedTagKey === tagManagementKey;
                      const shouldShowTagColor = isSelected || isManaged;

                      return (
                        <div key={tag.value} className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              if (isManagingTags) {
                                setManagedTagKey(tagManagementKey);
                                return;
                              }

                              const nextTags = isSelected
                                ? row.tags.filter((value) => value !== tag.value)
                                : [...row.tags, tag.value];

                              updateTradeRow(row.id, 'tags', nextTags, 0);
                            }}
                            className={cn(
                              'w-full rounded-lg border px-2.5 py-1.5 text-left font-sans tabular-nums text-[13px] leading-4 transition-colors',
                              isManaged && 'ring-1 ring-white/35',
                              !shouldShowTagColor &&
                                'border-border bg-background/80 text-muted-foreground hover:bg-secondary hover:text-foreground'
                            )}
                            style={
                              shouldShowTagColor
                                ? {
                                    borderColor: `${tagColor}80`,
                                    backgroundColor: `${tagColor}1a`,
                                    color: tagColor,
                                  }
                                : undefined
                            }
                          >
                            <span className="mr-2" aria-hidden="true">
                              {tag.emoji}
                            </span>
                            {tag.label}
                          </button>

                          {isManagingTags && (
                            <button
                              type="button"
                              aria-label={`Elimina ${tag.label}`}
                              className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full border border-loss bg-background text-loss shadow-md transition-colors hover:bg-loss hover:text-white"
                              onClick={(event) => {
                                event.stopPropagation();
                                setTagToDelete(tag.value);
                              }}
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {customTags.map((tag) => {
                      const isSelected = row.tags.includes(tag);
                      const tagColor = getTagColor(tag, tagColors);
                      const tagManagementKey = `${row.id}:${tag}`;
                      const isManaged = managedTagKey === tagManagementKey;
                      const shouldShowTagColor = isSelected || isManaged;

                      return (
                        <div key={tag} className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              if (isManagingTags) {
                                setManagedTagKey(tagManagementKey);
                                return;
                              }

                              const nextTags = isSelected
                                ? row.tags.filter((value) => value !== tag)
                                : [...row.tags, tag];

                              updateTradeRow(row.id, 'tags', nextTags, 0);
                            }}
                            className={cn(
                              'w-full rounded-lg border px-2.5 py-1.5 text-left font-sans tabular-nums text-[13px] leading-4 transition-colors',
                              isManaged && 'ring-1 ring-white/35',
                              !shouldShowTagColor &&
                                'border-border bg-background/80 text-muted-foreground hover:bg-secondary hover:text-foreground'
                            )}
                            style={
                              shouldShowTagColor
                                ? {
                                    borderColor: `${tagColor}80`,
                                    backgroundColor: `${tagColor}1a`,
                                    color: tagColor,
                                  }
                                : undefined
                            }
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
                                setTagToDelete(tag);
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
                        onUpdateTagColor(
                          value,
                          customTagColors[row.id] ?? DEFAULT_TAG_COLOR
                        );

                        if (!row.tags.includes(value)) {
                          updateTradeRow(row.id, 'tags', [...row.tags, value], 0);
                        }

                        setCustomTagInputs((previous) => ({
                          ...previous,
                          [row.id]: '',
                        }));
                        setCustomTagColors((previous) => ({
                          ...previous,
                          [row.id]: DEFAULT_TAG_COLOR,
                        }));
                      }}
                      placeholder="Crea un tag personalizzato"
                      className="h-8 min-w-0 border-border/70 bg-background/60 font-sans tabular-nums text-[13px] placeholder:text-muted-foreground/60"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 font-sans tabular-nums text-xs"
                      disabled={!customTagInputs[row.id]?.trim()}
                      onClick={() => {
                        const label = customTagInputs[row.id]?.trim();

                        if (!label) {
                          return;
                        }

                        const value = `${CUSTOM_TAG_PREFIX}${label}`;

                        onAddCustomTag(value);
                        onUpdateTagColor(
                          value,
                          customTagColors[row.id] ?? DEFAULT_TAG_COLOR
                        );

                        if (!row.tags.includes(value)) {
                          updateTradeRow(row.id, 'tags', [...row.tags, value], 0);
                        }

                        setCustomTagInputs((previous) => ({
                          ...previous,
                          [row.id]: '',
                        }));
                        setCustomTagColors((previous) => ({
                          ...previous,
                          [row.id]: DEFAULT_TAG_COLOR,
                        }));
                      }}
                    >
                      Aggiungi
                    </Button>
                    <Button
                      type="button"
                      variant={isManagingTags ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 px-3 font-sans tabular-nums text-xs"
                      disabled={!canManageTags}
                      onClick={() =>
                        setIsManagingTags((previous) => {
                          setManagedTagKey(null);
                          return !previous;
                        })
                      }
                    >
                      Gestisci
                    </Button>
                    {isManagingTags &&
                    managedTagKey?.startsWith(`${row.id}:`) ? (
                      <div className="min-[430px]:col-span-3">
                        {(() => {
                          const managedTag = managedTagKey.slice(
                            `${row.id}:`.length
                          );
                          const presetTag = TRADE_TAGS.find(
                            (tag) => tag.value === managedTag
                          );
                          const label =
                            presetTag?.label ??
                            managedTag.slice(CUSTOM_TAG_PREFIX.length);

                          return (
                            <TagColorPicker
                              value={getTagColor(managedTag, tagColors)}
                              label={label}
                              onChange={(color) =>
                                onUpdateTagColor(managedTag, color)
                              }
                            />
                          );
                        })()}
                      </div>
                    ) : customTagInputs[row.id]?.trim() ? (
                      <div className="min-[430px]:col-span-3">
                        <TagColorPicker
                          value={
                            customTagColors[row.id] ?? DEFAULT_TAG_COLOR
                          }
                          label="nuovo tag"
                          onChange={(color) =>
                            setCustomTagColors((previous) => ({
                              ...previous,
                              [row.id]: color,
                            }))
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-border/70 bg-background/30 p-3 sm:p-3.5">
                  <Label className="text-[11px] font-medium tracking-normal text-muted-foreground">
                    EMOZIONI
                  </Label>

                  <div className="flex flex-wrap gap-2">
                      {[...presetEmotions.map(item => item.value), ...emotionPrefs.custom].map(value => {
                        const emotion = getEmotion(value);
                        const isSelected = row.emotions.includes(value);
                        const color = getTagColor(emotionColorKey(value), emotionPrefs.colors);
                        const managementKey = `${row.id}:${value}`;
                        const isManaged = managedEmotionKey === managementKey;
                        const showColor = isSelected || isManaged;

                        return (
                          <div key={value} className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                if (isManagingEmotions) {
                                  setManagedEmotionKey(managementKey);
                                  return;
                                }

                                updateTradeRow(
                                  row.id,
                                  'emotions',
                                  isSelected
                                    ? row.emotions.filter(item => item !== value)
                                    : [...row.emotions, value],
                                  0
                                );
                              }}
                              className={cn(
                                'w-full rounded-lg border px-2.5 py-1.5 text-left font-sans tabular-nums text-[13px] leading-4 transition-colors',
                                isManaged && 'ring-1 ring-white/35',
                                !showColor &&
                                  'border-border bg-background/80 text-muted-foreground hover:bg-secondary hover:text-foreground'
                              )}
                              style={
                                showColor
                                  ? { borderColor: `${color}80`, backgroundColor: `${color}1a`, color }
                                  : undefined
                              }
                            >
                              {emotion?.emoji ? (
                                <span className="mr-2" aria-hidden="true">
                                  {emotion.emoji}
                                </span>
                              ) : null}
                              {emotion?.label ?? value}
                            </button>

                            {isManagingEmotions && (
                              <button
                                type="button"
                                aria-label={`Elimina ${emotion?.label ?? value}`}
                                className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full border border-loss bg-background text-loss shadow-md transition-colors hover:bg-loss hover:text-white"
                                onClick={event => {
                                  event.stopPropagation();
                                  setEmotionToDelete(value);
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
                      value={customEmotionInputs[row.id] ?? ''}
                      onChange={event =>
                        setCustomEmotionInputs(previous => ({ ...previous, [row.id]: event.target.value }))
                      }
                      onKeyDown={event => {
                        if (event.key !== 'Enter') return;

                        event.preventDefault();
                        addCustomEmotion(row.id, row.emotions);
                      }}
                      placeholder="Crea un'emozione personalizzata"
                      className="h-8 min-w-0 border-border/70 bg-background/60 font-sans tabular-nums text-[13px] placeholder:text-muted-foreground/60"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 font-sans tabular-nums text-xs"
                      disabled={!customEmotionInputs[row.id]?.trim()}
                      onClick={() => addCustomEmotion(row.id, row.emotions)}
                    >
                      Aggiungi
                    </Button>
                    <Button
                      type="button"
                      variant={isManagingEmotions ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 px-3 font-sans tabular-nums text-xs"
                      disabled={!canManageEmotions}
                      onClick={() =>
                        setIsManagingEmotions(previous => {
                          setManagedEmotionKey(null);
                          return !previous;
                        })
                      }
                    >
                      Gestisci
                    </Button>
                    {isManagingEmotions && managedEmotionKey?.startsWith(`${row.id}:`) ? (
                      <div className="min-[430px]:col-span-3">
                        {(() => {
                          const managed = managedEmotionKey.slice(`${row.id}:`.length);

                          return (
                            <TagColorPicker
                              value={getTagColor(emotionColorKey(managed), emotionPrefs.colors)}
                              label={getEmotion(managed)?.label ?? managed}
                              onChange={color => setEmotionColor(managed, color)}
                            />
                          );
                        })()}
                      </div>
                    ) : customEmotionInputs[row.id]?.trim() ? (
                      <div className="min-[430px]:col-span-3">
                        <TagColorPicker
                          value={customEmotionColors[row.id] ?? DEFAULT_TAG_COLOR}
                          label="nuova emozione"
                          onChange={color =>
                            setCustomEmotionColors(previous => ({ ...previous, [row.id]: color }))
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background/30 p-3 sm:p-3.5">
                  <Label className="font-sans tabular-nums text-[11px] font-medium tracking-normal text-muted-foreground">
                    Note trade
                  </Label>

                  <Textarea
                    ref={resizeNotesTextarea}
                    value={row.notes}
                    onChange={(event) => {
                      resizeNotesTextarea(event.currentTarget);
                      updateTradeRow(row.id, 'notes', event.target.value);
                    }}
                    onBlur={() => persistCurrentRows()}
                    placeholder="Cosa è successo in questo trade? Narrativa, contesto, cosa rifaresti..."
                    className="min-h-[90px] resize-none overflow-hidden border-border/70 bg-background/60 text-sm sm:min-h-[110px]"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-background/30 px-3 py-3 sm:gap-4 sm:px-4">
            {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={addTradeRow}
              className="gap-2 border-border max-sm:w-full"
            >
              <Plus className="size-4" />
              Aggiungi trade
            </Button>
            )}

            <span className="min-w-0 break-words font-sans tabular-nums text-xs text-muted-foreground sm:text-sm">
              Trade: {tradeRows.length} | Totale giorno:{' '}
              <span className={cn(dayTotal > 0 && 'text-profit', dayTotal < 0 && 'text-loss')}>
                {streamerMode ? '******' : `${dayTotal.toFixed(2)} USD`}
              </span>
            </span>
          </div>
          </fieldset>
        </div>

        {readOnly ? (
          <div className="flex justify-end border-t border-border px-4 py-3.5 sm:px-6 sm:py-4">
            <Button variant="outline" onClick={onClose}>
              Chiudi
            </Button>
          </div>
        ) : (
        <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3.5 max-sm:[&_button]:w-full sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDayConfirmOpen(true)}
          >
            Elimina giorno
          </Button>

          <div className="flex items-center justify-end gap-3 max-sm:flex-col-reverse max-sm:items-stretch">
            <span
              className={cn(
                'min-h-4 text-right font-sans tabular-nums text-[11px] tracking-normal text-muted-foreground/70',
                autosaveStatus === 'saving' && 'text-profit/80',
                autosaveStatus === 'saved' && 'text-muted-foreground/80'
              )}
              aria-live="polite"
            >
              {autosaveStatus === 'saving'
                ? 'Salvataggio...'
                : autosaveStatus === 'saved'
                  ? 'Salvato in automatico'
                  : ''}
            </span>

            <Button onClick={handleSalva} className="bg-profit text-background hover:bg-profit/90">
              Salva
            </Button>
          </div>
        </div>
        )}
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
        open={Boolean(screenshotToDelete)}
        onOpenChange={(open) => !open && setScreenshotToDelete(null)}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-[460px] border-border bg-card">
          <DialogHeader>
            <DialogTitle>Eliminare questa immagine?</DialogTitle>
            <DialogDescription>
              Il link all&apos;immagine verrà rimosso dal trade.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:[&_button]:w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setScreenshotToDelete(null)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              className="bg-loss text-white hover:bg-loss/90"
              onClick={confirmRemoveScreenshot}
            >
              Elimina immagine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(tagToDelete)}
        onOpenChange={(open) => !open && setTagToDelete(null)}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-[460px] border-border bg-card">
          <DialogHeader>
            <DialogTitle>Elimina tag</DialogTitle>
            <DialogDescription>
              Vuoi eliminare questo tag? Verrà rimosso anche dai trade in cui è
              stato utilizzato.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:[&_button]:w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTagToDelete(null)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              className="bg-loss text-white hover:bg-loss/90"
              onClick={confirmRemoveTag}
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(emotionToDelete)}
        onOpenChange={open => !open && setEmotionToDelete(null)}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-[460px] border-border bg-card">
          <DialogHeader>
            <DialogTitle>Elimina emozione</DialogTitle>
            <DialogDescription>
              Vuoi eliminare questa emozione? Verrà rimossa anche dai trade in cui è stata utilizzata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:[&_button]:w-full">
            <Button type="button" variant="outline" onClick={() => setEmotionToDelete(null)}>
              Annulla
            </Button>
            <Button
              type="button"
              className="bg-loss text-white hover:bg-loss/90"
              onClick={confirmRemoveEmotion}
            >
              Elimina
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
              Questa azione cancellerà tutti i trade e le informazioni salvate per questa giornata.
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

function TagColorPicker({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (color: string) => void;
}) {
  return (
    <div
      className="mt-1 flex w-fit items-center gap-1"
      aria-label={`Colore del tag ${label}`}
    >
      {TAG_COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Imposta colore ${color}`}
          aria-pressed={value === color}
          className={cn(
            'size-4 rounded-full border transition-transform hover:scale-110',
            value === color
              ? 'border-white ring-1 ring-white/50'
              : 'border-white/15'
          )}
          style={{ backgroundColor: color }}
          onClick={(event) => {
            event.stopPropagation();
            onChange(color);
          }}
        />
      ))}
    </div>
  );
}
