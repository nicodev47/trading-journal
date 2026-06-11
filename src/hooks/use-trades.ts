'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Trade, JournalState, WeeklyPlan } from '@/lib/types/trade';

const STORAGE_KEY_PREFIX = 'eclipse-trading-journal-data';
const MIGRATION_KEY_PREFIX = 'eclipse-trading-journal-migration-v3';
const TRADES_RESET_KEY_PREFIX = 'eclipse-trading-journal-trades-reset-v1';

export type JournalWorkspace = 'personal' | 'student';

const initialState: JournalState = {
  trades: [],
  tags: [],
  strategies: [],
  weeklyPlans: [],
  settings: {
    currency: 'USD',
    defaultLotSize: 0.01,
  },
};

export function useTrades(workspace: JournalWorkspace = 'personal') {
  const storageKey = `${STORAGE_KEY_PREFIX}-${workspace}`;
  const migrationKey = `${MIGRATION_KEY_PREFIX}-${workspace}`;
  const tradesResetKey = `${TRADES_RESET_KEY_PREFIX}-${workspace}`;

  const [state, setState] = useState<JournalState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage whenever the selected workspace changes
  useEffect(() => {
    setIsLoaded(false);

    try {
      const stored = localStorage.getItem(storageKey);
      const hasMigrated = localStorage.getItem(migrationKey);
      const hasResetTrades = localStorage.getItem(tradesResetKey);
      
      if (stored) {
        const parsed = JSON.parse(stored) as JournalState;
        
        // Clear all strategies on migration v3 (force empty start)
        let strategies = parsed.strategies || [];
        if (!hasMigrated) {
          strategies = [];
          localStorage.setItem(migrationKey, 'true');
        }

        const trades = hasResetTrades ? parsed.trades || [] : [];
        if (!hasResetTrades) {
          localStorage.setItem(tradesResetKey, 'true');
        }
        
        setState({
          ...initialState,
          ...parsed,
          trades,
          tags: parsed.tags || [],
          strategies: strategies,
          weeklyPlans: parsed.weeklyPlans || [],
        });
      } else {
        setState(initialState);
        if (!hasMigrated) {
          localStorage.setItem(migrationKey, 'true');
        }
        if (!hasResetTrades) {
          localStorage.setItem(tradesResetKey, 'true');
        }
      }
    } catch (error) {
      console.error('Failed to load trades from localStorage:', error);
    }
    setIsLoaded(true);
  }, [storageKey, migrationKey, tradesResetKey]);

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
      trades: [...prev.trades, trade],
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

  const importData = useCallback((jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString) as JournalState;
      if (data.trades && Array.isArray(data.trades)) {
        setState({
          ...initialState,
          ...data,
          tags: data.tags || [],
          strategies: data.strategies || [],
          weeklyPlans: data.weeklyPlans || [],
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const clearAllData = useCallback(() => {
    setState(initialState);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

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
    updateSettings,
    saveWeeklyPlan,
    getWeeklyPlan,
    exportData,
    importData,
    clearAllData,
    getTradesByDate,
    getTradeById,
  };
}
