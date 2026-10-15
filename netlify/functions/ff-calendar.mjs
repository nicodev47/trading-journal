// Serves Forex Factory's weekly calendar from our own origin: the upstream feed
// has no CORS headers and is rate limited, so it is fetched server-side and
// cached on Netlify's edge (shared by every visitor).
const FEED_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

const json = (body, status, headers = {}) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

export default async function handler() {
  try {
    const upstream = await fetch(FEED_URL, {
      headers: { 'user-agent': 'EclipseJournal/1.0 (+https://github.com/nicodev47/trading-journal)' },
    });

    if (!upstream.ok) {
      return json(JSON.stringify({ error: 'upstream', status: upstream.status }), 502, {
        'cache-control': 'no-store',
      });
    }

    return json(await upstream.text(), 200, {
      'cache-control': 'public, max-age=60',
      'netlify-cdn-cache-control':
        'public, s-maxage=600, stale-while-revalidate=86400, stale-if-error=86400, durable',
    });
  } catch {
    return json(JSON.stringify({ error: 'network' }), 502, { 'cache-control': 'no-store' });
  }
}

export const config = { path: '/api/ff-calendar' };
