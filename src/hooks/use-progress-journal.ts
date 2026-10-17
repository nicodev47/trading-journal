import { useCallback, useEffect, useState } from 'react';
import type { DailyAnalysis, MissedTrade } from '@/lib/types/trade';

/** Progress Tracker saved before it became one per journal: it belongs to Personale. */
export const LEGACY_PROGRESS_JOURNAL_STORAGE_KEY = 'eclipse-trading-journal-progress';
export const PROGRESS_JOURNAL_STORAGE_KEY = LEGACY_PROGRESS_JOURNAL_STORAGE_KEY;

export interface ProgressJournalData {
  dailyAnalyses: DailyAnalysis[];
  missedTrades: MissedTrade[];
}

const EMPTY: ProgressJournalData = { dailyAnalyses: [], missedTrades: [] };

const progressKey = (workspace: string) => `${LEGACY_PROGRESS_JOURNAL_STORAGE_KEY}-${workspace}`;

const parseProgress = (raw: string | null): ProgressJournalData | null => {
  if (raw === null) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ProgressJournalData> | null;

    return {
      dailyAnalyses: Array.isArray(parsed?.dailyAnalyses) ? parsed.dailyAnalyses : [],
      missedTrades: Array.isArray(parsed?.missedTrades) ? parsed.missedTrades : [],
    };
  } catch {
    return null;
  }
};

/** The Progress Tracker of one journal (Personale, Secondario, Backtest...). */
export function readProgressJournal(workspace: string): ProgressJournalData {
  try {
    const own = parseProgress(localStorage.getItem(progressKey(workspace)));

    if (own) return own;

    // Entries written before the tracker was split per journal go to Personale.
    return workspace === 'personal'
      ? parseProgress(localStorage.getItem(LEGACY_PROGRESS_JOURNAL_STORAGE_KEY)) ?? EMPTY
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

const writeProgressJournal = (workspace: string, data: ProgressJournalData) => {
  try {
    localStorage.setItem(progressKey(workspace), JSON.stringify(data));
  } catch {
    // Storage full or unavailable: the entries stay in memory only.
  }
};

/** Existing days and ids win over the incoming ones. */
export function mergeProgressJournal(
  current: ProgressJournalData,
  incoming: Partial<ProgressJournalData>
): ProgressJournalData {
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
}

/**
 * Each journal has a Progress Tracker of its own: the thinking behind its days.
 * It is stored apart from the trading journals, under the journal's id.
 */
export function useProgressJournal(workspace: string) {
  const [store, setStore] = useState(() => ({ workspace, data: readProgressJournal(workspace) }));

  // Switching journal loads that journal's entries.
  if (store.workspace !== workspace) {
    setStore({ workspace, data: readProgressJournal(workspace) });
  }

  const data = store.workspace === workspace ? store.data : readProgressJournal(workspace);

  useEffect(() => {
    writeProgressJournal(store.workspace, store.data);
  }, [store]);

  const update = useCallback(
    (change: (current: ProgressJournalData) => ProgressJournalData) => {
      setStore(current => ({ ...current, data: change(current.data) }));
    },
    []
  );

  const saveDailyAnalysis = useCallback((analysis: DailyAnalysis) => {
    update(current => ({
      ...current,
      dailyAnalyses: [...current.dailyAnalyses.filter(item => item.date !== analysis.date), analysis],
    }));
  }, [update]);

  const deleteDailyAnalysis = useCallback((date: string) => {
    update(current => ({
      ...current,
      dailyAnalyses: current.dailyAnalyses.filter(item => item.date !== date),
    }));
  }, [update]);

  const addMissedTrade = useCallback((missed: MissedTrade) => {
    update(current => ({ ...current, missedTrades: [...current.missedTrades, missed] }));
  }, [update]);

  const updateMissedTrade = useCallback((id: string, updates: Partial<MissedTrade>) => {
    update(current => ({
      ...current,
      missedTrades: current.missedTrades.map(item =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      ),
    }));
  }, [update]);

  const deleteMissedTrade = useCallback((id: string) => {
    update(current => ({
      ...current,
      missedTrades: current.missedTrades.filter(item => item.id !== id),
    }));
  }, [update]);

  /** Imports entries from a file into any journal: existing days and ids win. */
  const importJournalFor = useCallback(
    (target: string, incoming: Partial<ProgressJournalData>) => {
      if (target === workspace) {
        update(current => mergeProgressJournal(current, incoming));

        return;
      }

      writeProgressJournal(target, mergeProgressJournal(readProgressJournal(target), incoming));
    },
    [update, workspace]
  );

  return {
    ...data,
    saveDailyAnalysis,
    deleteDailyAnalysis,
    addMissedTrade,
    updateMissedTrade,
    deleteMissedTrade,
    importJournalFor,
  };
}
