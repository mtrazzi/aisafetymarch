// Vote API for aitreatymarch.org/vote — stores "A beat B" picks in a D1 table.
//   POST /vote   {album, winner, loser, voter}   → {ok:true}
//   GET  /stats?album=sf                         → {photos:{id:{wins,shows}}, votes, voters}
//   GET  /pairs?album=sf                         → {pairs:[[winner, loser, n]], votes, voters}
// Albums and how many photos each has; ids look like "sf-001".
const ALBUMS = { sf2: 12, movement: 10, dc: 8 };   // sf2 = the 12-photo SF pick (old 194-photo 'sf' retired)
const ORIGINS = ['https://aitreatymarch.org', 'https://www.aitreatymarch.org'];

function cors(req) {
  const o = req.headers.get('Origin') || '';
  const ok = ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return {
    'Access-Control-Allow-Origin': ok ? o : ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}
const json = (req, body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(req), ...extra } });

function validId(album, id) {
  const m = new RegExp(`^${album}-(\\d{3})$`).exec(id || '');
  return m && +m[1] >= 1 && +m[1] <= ALBUMS[album];
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });

    if (url.pathname === '/vote' && req.method === 'POST') {
      let b;
      try { b = await req.json(); } catch { return json(req, { error: 'bad json' }, 400); }
      const { album, winner, loser } = b;
      const voter = String(b.voter || '').slice(0, 40);
      if (!ALBUMS[album] || !validId(album, winner) || !validId(album, loser) || winner === loser)
        return json(req, { error: 'bad vote' }, 400);
      // Light flood guard: at most 600 votes per voter id per album.
      const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM votes WHERE album=? AND voter=?').bind(album, voter).first();
      if (n >= 600) return json(req, { error: 'limit' }, 429);
      await env.DB.prepare('INSERT INTO votes (album, winner, loser, voter, ts) VALUES (?,?,?,?,?)')
        .bind(album, winner, loser, voter, Date.now()).run();
      return json(req, { ok: true });
    }

    if (url.pathname === '/stats' && req.method === 'GET') {
      const album = url.searchParams.get('album');
      if (!ALBUMS[album]) return json(req, { error: 'unknown album' }, 404);
      const [w, l, t] = await env.DB.batch([
        env.DB.prepare('SELECT winner AS id, COUNT(*) AS n FROM votes WHERE album=? GROUP BY winner').bind(album),
        env.DB.prepare('SELECT loser AS id, COUNT(*) AS n FROM votes WHERE album=? GROUP BY loser').bind(album),
        env.DB.prepare('SELECT COUNT(*) AS votes, COUNT(DISTINCT voter) AS voters FROM votes WHERE album=?').bind(album),
      ]);
      const photos = {};
      for (const r of w.results) (photos[r.id] ||= { wins: 0, shows: 0 }), (photos[r.id].wins += r.n), (photos[r.id].shows += r.n);
      for (const r of l.results) (photos[r.id] ||= { wins: 0, shows: 0 }), (photos[r.id].shows += r.n);
      return json(req, { photos, ...t.results[0] }, 200, { 'Cache-Control': 'no-store' });
    }

    // Every match-up result as [winner, loser, times], for the score + confidence on Top picks.
    if (url.pathname === '/pairs' && req.method === 'GET') {
      const album = url.searchParams.get('album');
      if (!ALBUMS[album]) return json(req, { error: 'unknown album' }, 404);
      const [p, t] = await env.DB.batch([
        env.DB.prepare('SELECT winner, loser, COUNT(*) AS n FROM votes WHERE album=? GROUP BY winner, loser').bind(album),
        env.DB.prepare('SELECT COUNT(*) AS votes, COUNT(DISTINCT voter) AS voters FROM votes WHERE album=?').bind(album),
      ]);
      return json(req, { pairs: p.results.map(r => [r.winner, r.loser, r.n]), ...t.results[0] }, 200, { 'Cache-Control': 'no-store' });
    }

    return json(req, { error: 'not found' }, 404);
  },
};
