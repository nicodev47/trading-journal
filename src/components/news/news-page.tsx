'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Folder, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DEFAULT_NEWS_FILTERS,
  filterNews,
  formatNewsTime,
  getNewsCurrencies,
  getNewsDayKey,
  groupNewsByDay,
  parseStoredNewsFilters,
  type NewsEvent,
  type NewsFilters,
  type NewsImpact,
} from '@/lib/news';
import { cn } from '@/lib/utils';
import { useNews } from './use-news';

const FILTERS_KEY = 'eclipse-news-filters';

const IMPACT_META: Record<NewsImpact, { label: string; className: string }> = {
  High: { label: 'Alto', className: 'text-[#ff5a5f]' },
  Medium: { label: 'Medio', className: 'text-[#ff9f0a]' },
  Low: { label: 'Basso', className: 'text-[#ffd60a]' },
  Holiday: { label: 'Festivi', className: 'text-[#8e8e93]' },
};
const IMPACT_ORDER: NewsImpact[] = ['High', 'Medium', 'Low', 'Holiday'];

const dayLabel = (dayKey: string) =>
  new Date(`${dayKey}T12:00:00`).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

function ImpactIcon({ impact }: { impact: NewsImpact }) {
  return <Folder className={cn('size-[18px] shrink-0 fill-current', IMPACT_META[impact].className)} />;
}

function EventRow({ event }: { event: NewsEvent }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 font-sans text-sm sm:gap-4 sm:px-5">
      <span className="w-12 shrink-0 font-mono text-[13px] font-semibold tabular-nums text-foreground">
        {formatNewsTime(event.timestamp)}
      </span>
      <ImpactIcon impact={event.impact} />
      <span className="w-10 shrink-0 text-xs text-muted-foreground">{event.currency}</span>
      <span className="min-w-0 flex-1 truncate text-foreground">{event.title}</span>
      {(event.forecast || event.previous) && (
        <span className="hidden shrink-0 font-mono text-xs tabular-nums text-muted-foreground sm:block">
          {event.forecast && (
            <>
              <span className="text-muted-foreground/60">F</span> {event.forecast}
            </>
          )}
          {event.forecast && event.previous && <span className="mx-2" />}
          {event.previous && (
            <>
              <span className="text-muted-foreground/60">P</span> {event.previous}
            </>
          )}
        </span>
      )}
    </li>
  );
}

export function NewsPage() {
  const { events, fetchedAt, loading, error, refresh } = useNews();
  const [mode, setMode] = useState<'day' | 'week'>('week');
  const [filters, setFilters] = useState<NewsFilters>(() => {
    try {
      return parseStoredNewsFilters(localStorage.getItem(FILTERS_KEY));
    } catch {
      return DEFAULT_NEWS_FILTERS;
    }
  });
  const todayKey = getNewsDayKey(Date.now());
  const [dayKey, setDayKey] = useState(todayKey);

  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    } catch {
      // Filters stay for this session only.
    }
  }, [filters]);

  const filtered = useMemo(() => filterNews(events, filters), [events, filters]);
  const weekDays = useMemo(() => groupNewsByDay(filtered), [filtered]);
  const allDays = useMemo(() => groupNewsByDay(events).map(day => day.dayKey), [events]);
  const currencies = useMemo(() => getNewsCurrencies(events), [events]);

  // The visible day is one of the days of the week covered by the feed.
  const dayIndex = allDays.indexOf(dayKey);
  const shownDay = weekDays.find(day => day.dayKey === dayKey);
  const isDefault =
    filters.impacts.join() === DEFAULT_NEWS_FILTERS.impacts.join() &&
    filters.currencies.join() === DEFAULT_NEWS_FILTERS.currencies.join();

  const toggleImpact = (impact: NewsImpact) =>
    setFilters(current => ({
      ...current,
      impacts: current.impacts.includes(impact)
        ? current.impacts.filter(value => value !== impact)
        : [...current.impacts, impact],
    }));
  const toggleCurrency = (currency: string) =>
    setFilters(current => ({
      ...current,
      currencies: current.currencies.includes(currency)
        ? current.currencies.filter(value => value !== currency)
        : [...current.currencies, currency],
    }));

  const summary = `${mode === 'day' ? shownDay?.events.length ?? 0 : filtered.length} eventi · ${
    filters.impacts.length ? filters.impacts.map(impact => IMPACT_META[impact].label).join(', ') : 'nessun impatto'
  } · ${filters.currencies.length ? filters.currencies.join(' ') : 'tutte le valute'}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-wider">News</h2>
          <span className="font-sans text-xs text-muted-foreground">Forex Factory · questa settimana</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-secondary p-1">
            {(['day', 'week'] as const).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={cn(
                  'rounded-full px-3.5 py-1 font-sans text-xs font-medium transition',
                  mode === item ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item === 'day' ? 'Giorno' : 'Settimana'}
              </button>
            ))}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground">
                <SlidersHorizontal className="size-3.5" />
                Filtri
                {!isDefault && <span className="size-1.5 rounded-full bg-white" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[280px] rounded-xl p-3">
              <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Impatto
              </p>
              <div className="mb-4 flex flex-col gap-1">
                {IMPACT_ORDER.map(impact => (
                  <label
                    key={impact}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 font-sans text-sm hover:bg-white/[0.06]"
                  >
                    <input
                      type="checkbox"
                      checked={filters.impacts.includes(impact)}
                      onChange={() => toggleImpact(impact)}
                      className="size-3.5 accent-white"
                    />
                    <ImpactIcon impact={impact} />
                    {IMPACT_META[impact].label}
                  </label>
                ))}
              </div>

              <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Valute
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {currencies.map(currency => {
                  const active = filters.currencies.includes(currency);

                  return (
                    <button
                      key={currency}
                      type="button"
                      onClick={() => toggleCurrency(currency)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 font-sans text-xs font-medium transition',
                        active
                          ? 'border-white/60 bg-white/15 text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {currency}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  className="font-sans text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setFilters({ ...filters, currencies: [] })}
                >
                  Tutte le valute
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={isDefault}
                  onClick={() => setFilters(DEFAULT_NEWS_FILTERS)}
                >
                  Ripristina
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label="Aggiorna le news"
            disabled={loading}
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {mode === 'day' && (
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Giorno precedente"
            disabled={dayIndex <= 0}
            onClick={() => setDayKey(allDays[dayIndex - 1])}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-28 text-center font-sans text-sm font-semibold capitalize">{dayLabel(dayKey)}</span>
          {dayKey === todayKey && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
              Oggi
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Giorno successivo"
            disabled={dayIndex < 0 || dayIndex >= allDays.length - 1}
            onClick={() => setDayKey(allDays[dayIndex + 1])}
          >
            <ChevronRight className="size-4" />
          </Button>
          {dayKey !== todayKey && (
            <button
              type="button"
              className="ml-auto font-sans text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setDayKey(todayKey)}
            >
              Vai a oggi
            </button>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <div className="px-5 py-14 text-center font-sans text-sm text-muted-foreground">
          {loading
            ? 'Caricamento delle news…'
            : error
              ? 'Impossibile caricare le news. Controlla la connessione e riprova con il pulsante di aggiornamento.'
              : 'Nessuna news disponibile.'}
        </div>
      ) : mode === 'day' ? (
        shownDay && shownDay.events.length > 0 ? (
          <ul className="divide-y divide-border/50">
            {shownDay.events.map(event => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        ) : (
          <p className="px-5 py-14 text-center font-sans text-sm text-muted-foreground">
            Nessun evento per questo giorno con i filtri selezionati.
          </p>
        )
      ) : weekDays.length > 0 ? (
        weekDays.map(day => (
          <section key={day.dayKey}>
            <h3
              className={cn(
                'sticky top-0 border-y border-border bg-secondary/40 px-4 py-2 font-sans text-xs font-semibold capitalize text-muted-foreground backdrop-blur sm:px-5',
                day.dayKey === todayKey && 'text-foreground'
              )}
            >
              {dayLabel(day.dayKey)}
              {day.dayKey === todayKey && ' · Oggi'}
            </h3>
            <ul className="divide-y divide-border/50">
              {day.events.map(event => (
                <EventRow key={event.id} event={event} />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p className="px-5 py-14 text-center font-sans text-sm text-muted-foreground">
          Nessun evento con i filtri selezionati.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 font-sans text-[11px] text-muted-foreground sm:px-5">
        <span>{summary}</span>
        <span>
          Orari di Roma
          {fetchedAt &&
            ` · aggiornato alle ${new Date(fetchedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
          {error && events.length > 0 && ' · dati salvati, aggiornamento non riuscito'}
        </span>
      </div>
    </div>
  );
}
