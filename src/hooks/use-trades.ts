'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CUSTOM_TAG_PREFIX,
  type MissedTrade,
  type Trade,
  type JournalState,
  type WeeklyPlan,
} from '@/lib/types/trade';

const STORAGE_KEY_PREFIX = 'eclipse-trading-journal-data';

export type JournalWorkspace = 'personal' | 'student' | 'backtest';
type LegacyTrade = Partial<Trade> & { mistakes?: string[] };
type LegacyJournalState = Partial<JournalState> & { customMistakes?: string[] };

const initialState: JournalState = {
  trades: [],
  missedTrades: [],
  tags: [],
  strategies: [],
  customTags: [],
  weeklyPlans: [],
  settings: {
    currency: 'USD',
    defaultLotSize: 0.01,
  },
};

const parseImportedJournal = (jsonString: string): JournalState | null => {
  try {
    const data = JSON.parse(jsonString) as LegacyJournalState;

    if (!Array.isArray(data.trades)) {
      return null;
    }

    const trades = (data.trades as LegacyTrade[]).map(trade => ({
      ...trade,
      tags: trade.tags?.length ? trade.tags : trade.mistakes ?? [],
      isFavorite: trade.isFavorite ?? false,
    })) as Trade[];
    const customTags = Array.from(
      new Set([
        ...(data.customTags || []),
        ...(data.customMistakes || []),
        ...trades.flatMap(trade =>
          (trade.tags || []).filter(tag =>
            tag.startsWith(CUSTOM_TAG_PREFIX)
          )
        ),
      ])
    );

    return {
      ...initialState,
      ...data,
      trades,
      missedTrades: Array.isArray(data.missedTrades)
        ? (data.missedTrades as MissedTrade[])
        : [],
      tags: data.tags || [],
      strategies: data.strategies || [],
      customTags,
      weeklyPlans: data.weeklyPlans || [],
      settings: {
        ...initialState.settings,
        ...(data.settings || {}),
      },
    };
  } catch {
    return null;
  }
};

const getTradeDedupKey = (trade: Trade) => {
  const date = trade.exitDate?.split('T')[0] || trade.entryDate?.split('T')[0] || '';
  const time =
    trade.exitDate?.split('T')[1]?.slice(0, 5) ||
    trade.entryDate?.split('T')[1]?.slice(0, 5) ||
    '';

  return [
    date,
    time,
    trade.pair?.trim() || '',
    trade.direction || '',
    trade.pnl ?? 0,
    trade.strategy?.trim() || '',
  ].join('|');
};

const mergeJournalState = (
  currentState: JournalState,
  importedState: JournalState
): JournalState => {
  const existingTradeIds = new Set(
    currentState.trades.map((trade) => trade.id).filter(Boolean)
  );
  const existingTradeKeys = new Set(currentState.trades.map(getTradeDedupKey));
  const mergedTrades = [...currentState.trades];

  importedState.trades.forEach((trade) => {
    const tradeKey = getTradeDedupKey(trade);

    if (
      (trade.id && existingTradeIds.has(trade.id)) ||
      existingTradeKeys.has(tradeKey)
    ) {
      return;
    }

    mergedTrades.push(trade);
    if (trade.id) existingTradeIds.add(trade.id);
    existingTradeKeys.add(tradeKey);
  });

  const mergedWeeklyPlans = [...currentState.weeklyPlans];
  const existingWeekKeys = new Set(
    currentState.weeklyPlans.map((plan) => plan.weekKey)
  );

  importedState.weeklyPlans.forEach((plan) => {
    if (!existingWeekKeys.has(plan.weekKey)) {
      mergedWeeklyPlans.push(plan);
      existingWeekKeys.add(plan.weekKey);
    }
  });

  return {
    ...currentState,
    trades: mergedTrades,
    missedTrades: [...currentState.missedTrades, ...importedState.missedTrades],
    tags: Array.from(new Set([...currentState.tags, ...importedState.tags])),
    strategies: Array.from(
      new Set([...currentState.strategies, ...importedState.strategies])
    ),
    customTags: Array.from(
      new Set([...currentState.customTags, ...importedState.customTags])
    ),
    weeklyPlans: mergedWeeklyPlans,
    settings: currentState.settings,
  };
};

export function useTrades(workspace: JournalWorkspace = 'personal') {
  const storageKey = `${STORAGE_KEY_PREFIX}-${workspace}`;

  const [state, setState] = useState<JournalState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage whenever the selected workspace changes
  useEffect(() => {
    setIsLoaded(false);

    try {
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        setState(parseImportedJournal(stored) || initialState);
      } else {
        setState(initialState);
      }
    } catch (error) {
      console.error('Failed to load trades from localStorage:', error);
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save trades to localStorage:', error);
      }
    }
  }, [state, isLoaded, storageKey]);

  const addTrade = useCallback((trade: Trade) => {
    setState(prev => ({
      ...prev,
      trades: [
        ...prev.trades,
        { ...trade, isFavorite: trade.isFavorite ?? false },
      ],
    }));
  }, []);

  const updateTrade = useCallback((id: string, updates: Partial<Trade>) => {
    setState(prev => ({
      ...prev,
      trades: prev.trades.map(trade =>
        trade.id === id
          ? { ...trade, ...updates, updatedAt: new Date().toISOString() }
          : trade
      ),
    }));
  }, []);

  const deleteTrade = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      trades: prev.trades.filter(trade => trade.id !== id),
    }));
  }, []);

  const addMissedTrade = useCallback((missedTrade: MissedTrade) => {
    setState(prev => ({
      ...prev,
      missedTrades: [...prev.missedTrades, missedTrade],
    }));
  }, []);

  const updateMissedTrade = useCallback((
    id: string,
    updates: Partial<MissedTrade>
  ) => {
    setState(prev => ({
      ...prev,
      missedTrades: prev.missedTrades.map(missedTrade =>
        missedTrade.id === id
          ? { ...missedTrade, ...updates, updatedAt: new Date().toISOString() }
          : missedTrade
      ),
    }));
  }, []);

  const deleteMissedTrade = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      missedTrades: prev.missedTrades.filter(missedTrade => missedTrade.id !== id),
    }));
  }, []);

  const saveMissedTradesForDate = useCallback((
    dateKey: string,
    missedTrades: MissedTrade[]
  ) => {
    setState(prev => ({
      ...prev,
      missedTrades: [
        ...prev.missedTrades.filter(missedTrade => missedTrade.date !== dateKey),
        ...missedTrades,
      ],
    }));
  }, []);

  const addTag = useCallback((tag: string) => {
    setState(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag],
    }));
  }, []);

  const removeTag = useCallback((tag: string) => {
    setState(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  }, []);

  const addStrategy = useCallback((strategy: string) => {
    setState(prev => ({
      ...prev,
      strategies: prev.strategies.includes(strategy)
        ? prev.strategies
        : [...prev.strategies, strategy],
    }));
  }, []);

  const removeStrategy = useCallback((strategy: string) => {
    setState(prev => ({
      ...prev,
      strategies: prev.strategies.filter(s => s !== strategy),
    }));
  }, []);

  const addCustomTag = useCallback((tag: string) => {
    setState(prev => ({
      ...prev,
      customTags: prev.customTags.includes(tag)
        ? prev.customTags
        : [...prev.customTags, tag],
    }));
  }, []);

  const removeCustomTag = useCallback((tag: string) => {
    setState(prev => ({
      ...prev,
      customTags: prev.customTags.filter(value => value !== tag),
      trades: prev.trades.map(trade => ({
        ...trade,
        tags: (trade.tags || []).filter(value => value !== tag),
      })),
    }));
  }, []);

  const updateSettings = useCallback((settings: Partial<JournalState['settings']>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  }, []);

  const saveWeeklyPlan = useCallback((plan: WeeklyPlan) => {
    setState(prev => {
      const existingIndex = prev.weeklyPlans.findIndex(p => p.weekKey === plan.weekKey);
      if (existingIndex >= 0) {
        const updated = [...prev.weeklyPlans];
        updated[existingIndex] = plan;
        return { ...prev, weeklyPlans: updated };
      }
      return { ...prev, weeklyPlans: [...prev.weeklyPlans, plan] };
    });
  }, []);

  const getWeeklyPlan = useCallback((weekKey: string): WeeklyPlan | undefined => {
    return state.weeklyPlans.find(p => p.weekKey === weekKey);
  }, [state.weeklyPlans]);

  const exportData = useCallback((): string => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importData = useCallback((
    jsonString: string,
    targetWorkspace: JournalWorkspace = workspace
  ): boolean => {
    const importedState = parseImportedJournal(jsonString);

    if (!importedState) {
      return false;
    }

    const targetStorageKey = `${STORAGE_KEY_PREFIX}-${targetWorkspace}`;

    try {
      localStorage.setItem(targetStorageKey, JSON.stringify(importedState));

      if (targetWorkspace === workspace) {
        setState(importedState);
      }

      return true;
    } catch (error) {
      console.error('Failed to import journal data:', error);
      return false;
    }
  }, [workspace]);

  const appendImportData = useCallback((
    jsonString: string,
    targetWorkspace: JournalWorkspace = workspace
  ): boolean => {
    const importedState = parseImportedJournal(jsonString);

    if (!importedState) {
      return false;
    }

    const targetStorageKey = `${STORAGE_KEY_PREFIX}-${targetWorkspace}`;

    try {
      const stored = localStorage.getItem(targetStorageKey);
      const currentState =
        targetWorkspace === workspace
          ? state
          : stored
            ? parseImportedJournal(stored) || initialState
            : initialState;
      const mergedState = mergeJournalState(currentState, importedState);

      localStorage.setItem(targetStorageKey, JSON.stringify(mergedState));

      if (targetWorkspace === workspace) {
        setState(mergedState);
      }

      return true;
    } catch (error) {
      console.error('Failed to append journal data:', error);
      return false;
    }
  }, [state, workspace]);

  const clearAllData = useCallback(() => {
    setState(initialState);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const getWorkspaceData = useCallback((targetWorkspace: JournalWorkspace) => {
    if (targetWorkspace === workspace) {
      return state;
    }

    const stored = localStorage.getItem(
      `${STORAGE_KEY_PREFIX}-${targetWorkspace}`
    );

    return stored ? parseImportedJournal(stored) || initialState : initialState;
  }, [state, workspace]);

  const clearWorkspaceData = useCallback((targetWorkspace: JournalWorkspace) => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}-${targetWorkspace}`);

    if (targetWorkspace === workspace) {
      setState(initialState);
    }
  }, [workspace]);

  const getTradesByDate = useCallback((dateKey: string): Trade[] => {
    return state.trades.filter(trade => trade.exitDate.startsWith(dateKey));
  }, [state.trades]);

  const getMissedTradesByDate = useCallback((dateKey: string): MissedTrade[] => {
    return state.missedTrades.filter(missedTrade => missedTrade.date === dateKey);
  }, [state.missedTrades]);

  const getTradeById = useCallback((id: string): Trade | undefined => {
    return state.trades.find(trade => trade.id === id);
  }, [state.trades]);

  return {
    trades: state.trades,
    missedTrades: state.missedTrades,
    tags: state.tags,
    strategies: state.strategies,
    customTags: state.customTags,
    weeklyPlans: state.weeklyPlans,
    settings: state.settings,
    isLoaded,
    addTrade,
    updateTrade,
    deleteTrade,
    addMissedTrade,
    updateMissedTrade,
    deleteMissedTrade,
    saveMissedTradesForDate,
    addTag,
    removeTag,
    addStrategy,
    removeStrategy,
    addCustomTag,
    removeCustomTag,
    updateSettings,
    saveWeeklyPlan,
    getWeeklyPlan,
    exportData,
    importData,
    appendImportData,
    clearAllData,
    getWorkspaceData,
    clearWorkspaceData,
    getTradesByDate,
    getMissedTradesByDate,
    getTradeById,
  };
}
