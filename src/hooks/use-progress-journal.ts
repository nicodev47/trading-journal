import { useCallback, useEffect, useState } from 'react';
import type { DailyAnalysis, MissedTrade } from '@/lib/types/trade';

export const PROGRESS_JOURNAL_STORAGE_KEY = 'eclipse-trading-journal-progress';

export interface ProgressJournalData {
  dailyAnalyses: DailyAnalysis[];
  missedTrades: MissedTrade[];
}

const EMPTY: ProgressJournalData = { dailyAnalyses: [], missedTrades: [] };

export function readProgressJournal(): ProgressJournalData {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_JOURNAL_STORAGE_KEY) ?? 'null') as
      | Partial<ProgressJournalData>
      | null;

    return {
      dailyAnalyses: Array.isArray(parsed?.dailyAnalyses) ? parsed.dailyAnalyses : [],
      missedTrades: Array.isArray(parsed?.missedTrades) ? parsed.missedTrades : [],
    };
  } catch {
    return EMPTY;
  }
}

/**
 * The Progress Tracker is a journal of its own: the thinking behind the days,
 * across every account. It is stored apart from the trading journals.
 */
export function useProgressJournal() {
  const [data, setData] = useState<ProgressJournalData>(readProgressJournal);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_JOURNAL_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable: the entries stay in memory only.
    }
  }, [data]);

  const saveDailyAnalysis = useCallback((analysis: DailyAnalysis) => {
    setData(current => ({
      ...current,
      dailyAnalyses: [...current.dailyAnalyses.filter(item => item.date !== analysis.date), analysis],
    }));
  }, []);

  const deleteDailyAnalysis = useCallback((date: string) => {
    setData(current => ({
      ...current,
      dailyAnalyses: current.dailyAnalyses.filter(item => item.date !== date),
    }));
  }, []);

  const addMissedTrade = useCallback((missed: MissedTrade) => {
    setData(current => ({ ...current, missedTrades: [...current.missedTrades, missed] }));
  }, []);

  const updateMissedTrade = useCallback((id: string, updates: Partial<MissedTrade>) => {
    setData(current => ({
      ...current,
      missedTrades: current.missedTrades.map(item =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      ),
    }));
  }, []);

  const deleteMissedTrade = useCallback((id: string) => {
    setData(current => ({
      ...current,
      missedTrades: current.missedTrades.filter(item => item.id !== id),
    }));
  }, []);

  /** Imports entries from a backup: existing days and ids win. */
  const importJournal = useCallback((incoming: Partial<ProgressJournalData>) => {
    setData(current => {
      const dates = new Set(current.dailyAnalyses.map(item => item.date));
      const ids = new Set(current.missedTrades.map(item => item.id));

      return {
        dailyAnalyses: [
          ...current.dailyAnalyses,
          ...(incoming.dailyAnalyses ?? []).filter(item => !dates.has(item.date)),
        ],
        missedTrades: [
          ...current.missedTrades,
          ...(incoming.missedTrades ?? []).filter(item => !ids.has(item.id)),
        ],
      };
    });
  }, []);

  return {
    ...data,
    saveDailyAnalysis,
    deleteDailyAnalysis,
    addMissedTrade,
    updateMissedTrade,
    deleteMissedTrade,
    importJournal,
  };
}
