export type NewsImpact = 'High' | 'Medium' | 'Low' | 'Holiday';

export interface NewsEvent {
  id: string;
  title: string;
  currency: string;
  impact: NewsImpact;
  timestamp: number;
  forecast: string;
  previous: string;
}

export interface NewsFilters {
  impacts: NewsImpact[];
  currencies: string[];
}

/** Dollar news, red (high) and orange (medium) only. */
export const DEFAULT_NEWS_FILTERS: NewsFilters = {
  impacts: ['High', 'Medium'],
  currencies: ['USD'],
};

export const NEWS_TIMEZONE = 'Europe/Rome';

const IMPACTS: NewsImpact[] = ['High', 'Medium', 'Low', 'Holiday'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Parses the Forex Factory weekly JSON, ignoring malformed rows. */
export function parseNewsFeed(raw: unknown): NewsEvent[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .flatMap((item, index) => {
      if (!isRecord(item)) return [];

      const timestamp = new Date(String(item.date)).getTime();
      const impact = IMPACTS.find(value => value === item.impact);

      if (!impact || Number.isNaN(timestamp) || typeof item.title !== 'string') return [];

      return [
        {
          id: `${timestamp}-${index}`,
          title: item.title,
          currency: typeof item.country === 'string' ? item.country.toUpperCase() : '',
          impact,
          timestamp,
          forecast: typeof item.forecast === 'string' ? item.forecast : '',
          previous: typeof item.previous === 'string' ? item.previous : '',
        },
      ];
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function filterNews(events: NewsEvent[], filters: NewsFilters): NewsEvent[] {
  return events.filter(
    event =>
      filters.impacts.includes(event.impact) &&
      (filters.currencies.length === 0 || filters.currencies.includes(event.currency))
  );
}

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: NEWS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function partsOf(timestamp: number) {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(new Date(timestamp)).map(part => [part.type, part.value])
  );

  return { day: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** YYYY-MM-DD of an instant in the news timezone (Rome). */
export const getNewsDayKey = (timestamp: number) => partsOf(timestamp).day;

/** HH:mm of an instant in the news timezone (Rome). */
export const formatNewsTime = (timestamp: number) => partsOf(timestamp).time;

export interface NewsDay {
  dayKey: string;
  events: NewsEvent[];
}

export function groupNewsByDay(events: NewsEvent[]): NewsDay[] {
  const days = new Map<string, NewsEvent[]>();

  events.forEach(event => {
    const key = getNewsDayKey(event.timestamp);

    days.set(key, [...(days.get(key) ?? []), event]);
  });

  return Array.from(days.entries())
    .map(([dayKey, items]) => ({ dayKey, events: items }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

/** Currencies present in the feed, USD first, then alphabetical. */
export function getNewsCurrencies(events: NewsEvent[]): string[] {
  const currencies = Array.from(new Set(events.map(event => event.currency).filter(Boolean)));

  return currencies.sort((a, b) => (a === 'USD' ? -1 : b === 'USD' ? 1 : a.localeCompare(b)));
}

export function parseStoredNewsFilters(raw: string | null): NewsFilters {
  try {
    const data = JSON.parse(raw ?? 'null') as Partial<NewsFilters> | null;

    if (!data || !Array.isArray(data.impacts) || !Array.isArray(data.currencies)) {
      return DEFAULT_NEWS_FILTERS;
    }

    return {
      impacts: data.impacts.filter((value): value is NewsImpact => IMPACTS.includes(value as NewsImpact)),
      currencies: data.currencies.filter((value): value is string => typeof value === 'string'),
    };
  } catch {
    return DEFAULT_NEWS_FILTERS;
  }
}
