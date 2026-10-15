import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_NEWS_FILTERS,
  filterNews,
  formatNewsTime,
  getNewsCurrencies,
  getNewsDayKey,
  groupNewsByDay,
  parseNewsFeed,
  parseStoredNewsFilters,
} from '../src/lib/news.ts';

const feed = [
  { title: 'Core PPI m/m', country: 'USD', date: '2026-10-15T08:30:00-04:00', impact: 'High', forecast: '0.3%', previous: '0.2%' },
  { title: 'Unemployment Claims', country: 'USD', date: '2026-10-15T08:30:00-04:00', impact: 'Medium', forecast: '199K', previous: '197K' },
  { title: 'Minor', country: 'USD', date: '2026-10-15T10:00:00-04:00', impact: 'Low', forecast: '', previous: '' },
  { title: 'GDP m/m', country: 'GBP', date: '2026-10-15T02:00:00-04:00', impact: 'High', forecast: '', previous: '' },
  { title: 'Bank Holiday', country: 'USD', date: '2026-10-12T07:00:00-04:00', impact: 'Holiday', forecast: '', previous: '' },
  { title: 'Broken', country: 'USD', date: 'non-una-data', impact: 'High' },
  'non un oggetto',
];

test('ignora le righe non valide', () => {
  assert.equal(parseNewsFeed(feed).length, 5);
  assert.deepEqual(parseNewsFeed({}), []);
});

test('gli eventi sono ordinati per orario', () => {
  const events = parseNewsFeed(feed);

  assert.equal(events[0].title, 'Bank Holiday');
  assert.ok(events.every((event, index) => index === 0 || event.timestamp >= events[index - 1].timestamp));
});

test('di default solo dollaro con impatto alto e medio', () => {
  const titles = filterNews(parseNewsFeed(feed), DEFAULT_NEWS_FILTERS).map(event => event.title);

  assert.deepEqual(titles.sort(), ['Core PPI m/m', 'Unemployment Claims']);
});

test('filtri personalizzati: tutte le valute e festivi', () => {
  const events = filterNews(parseNewsFeed(feed), { impacts: ['High', 'Holiday'], currencies: [] });

  assert.deepEqual(events.map(event => event.title).sort(), ['Bank Holiday', 'Core PPI m/m', 'GDP m/m']);
});

test('gli orari sono in fuso di Roma (14:30 per le 8:30 di New York)', () => {
  const [core] = parseNewsFeed(feed).filter(event => event.title === 'Core PPI m/m');

  assert.equal(formatNewsTime(core.timestamp), '14:30');
  assert.equal(getNewsDayKey(core.timestamp), '2026-10-15');
});

test('raggruppa per giorno e elenca le valute con USD per prima', () => {
  const events = parseNewsFeed(feed);

  assert.deepEqual(groupNewsByDay(events).map(day => day.dayKey), ['2026-10-12', '2026-10-15']);
  assert.deepEqual(getNewsCurrencies(events), ['USD', 'GBP']);
});

test('filtri salvati non validi tornano ai predefiniti', () => {
  assert.deepEqual(parseStoredNewsFilters('boh'), DEFAULT_NEWS_FILTERS);
  assert.deepEqual(parseStoredNewsFilters(null), DEFAULT_NEWS_FILTERS);
  assert.deepEqual(
    parseStoredNewsFilters(JSON.stringify({ impacts: ['High', 'X'], currencies: ['EUR', 3] })),
    { impacts: ['High'], currencies: ['EUR'] }
  );
});
