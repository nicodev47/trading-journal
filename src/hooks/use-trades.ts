'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CUSTOM_MISTAKE_PREFIX,
  type Trade,
  type JournalState,
  type WeeklyPlan,
} from '@/lib/types/trade';

const STORAGE_KEY_PREFIX = 'eclipse-trading-journal-data';

export type JournalWorkspace = 'personal' | 'student';

const initialState: JournalState = {
  trades: [],
  tags: [],
  strategies: [],
  customMistakes: [],
  weeklyPlans: [],
  settings: {
    currency: 'USD',
    defaultLotSize: 0.01,
  },
};

const parseImportedJournal = (jsonString: string): JournalState | null => {
  try {
    const data = JSON.parse(jsonString) as Partial<JournalState>;

    if (!Array.isArray(data.trades)) {
      return null;
    }

    const trades = data.trades.map(trade => ({
      ...trade,
      mistakes: trade.mistakes || [],
      isFavorite: trade.isFavorite ?? false,
    }));
    const customMistakes = Array.from(
      new Set([
        ...(data.customMistakes || []),
        ...trades.flatMap(trade =>
          (trade.mistakes || []).filter(mistake =>
            mistake.startsWith(CUSTOM_MISTAKE_PREFIX)
          )
        ),
      ])
    );

    return {
      ...initialState,
      ...data,
      trades,
      tags: data.tags || [],
      strategies: data.strategies || [],
      customMistakes,
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

  const addCustomMistake = useCallback((mistake: string) => {
    setState(prev => ({
      ...prev,
      customMistakes: prev.customMistakes.includes(mistake)
        ? prev.customMistakes
        : [...prev.customMistakes, mistake],
    }));
  }, []);

  const removeCustomMistake = useCallback((mistake: string) => {
    setState(prev => ({
      ...prev,
      customMistakes: prev.customMistakes.filter(value => value !== mistake),
      trades: prev.trades.map(trade => ({
        ...trade,
        mistakes: (trade.mistakes || []).filter(value => value !== mistake),
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

  const getTradeById = useCallback((id: string): Trade | undefined => {
    return state.trades.find(trade => trade.id === id);
  }, [state.trades]);

  return {
    trades: state.trades,
    tags: state.tags,
    strategies: state.strategies,
    customMistakes: state.customMistakes,
    weeklyPlans: state.weeklyPlans,
    settings: state.settings,
    isLoaded,
    addTrade,
    updateTrade,
    deleteTrade,
    addTag,
    removeTag,
    addStrategy,
    removeStrategy,
    addCustomMistake,
    removeCustomMistake,
    updateSettings,
    saveWeeklyPlan,
    getWeeklyPlan,
    exportData,
    importData,
    clearAllData,
    getWorkspaceData,
    clearWorkspaceData,
    getTradesByDate,
    getTradeById,
  };
}
