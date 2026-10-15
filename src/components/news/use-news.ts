import { useCallback, useEffect, useState } from 'react';
import { parseNewsFeed, type NewsEvent } from '@/lib/news';

const CACHE_KEY = 'eclipse-news-cache';
/** The feed is refreshed upstream every few minutes: do not hammer it. */
const CACHE_MS = 10 * 60 * 1000;

interface Cache {
  fetchedAt: number;
  events: NewsEvent[];
}

const readCache = (): Cache | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as Cache | null;

    return parsed && Array.isArray(parsed.events) ? parsed : null;
  } catch {
    return null;
  }
};

export function useNews() {
  const [state, setState] = useState<{
    events: NewsEvent[];
    fetchedAt: number | null;
    loading: boolean;
    error: boolean;
  }>(() => {
    const cached = readCache();

    return {
      events: cached?.events ?? [],
      fetchedAt: cached?.fetchedAt ?? null,
      loading: false,
      error: false,
    };
  });

  const load = useCallback(async (force: boolean) => {
    const cached = readCache();

    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_MS) return;

    setState(current => ({ ...current, loading: true, error: false }));

    try {
      const response = await fetch('/api/ff-calendar', { cache: 'no-store' });

      if (!response.ok) throw new Error(String(response.status));

      const events = parseNewsFeed(await response.json());

      if (events.length === 0) throw new Error('empty');

      const next = { fetchedAt: Date.now(), events };

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      } catch {
        // The news simply won't be cached.
      }

      setState({ ...next, loading: false, error: false });
    } catch {
      // Keep whatever we had (possibly stale) and flag the failure.
      setState(current => ({ ...current, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  return { ...state, refresh: () => load(true) };
}
