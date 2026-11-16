// Photo face-off: show two photos, the visitor taps the one they'd rather click on, repeat.
// Each pick is sent to the vote API (vote/config.js). "Top picks" ranks photos by how often they win.
(function () {
  const { album, count } = window.VOTE;
  const API = (window.VOTE_API || '').replace(/\/$/, '');
  const ids = Array.from({ length: count }, (_, i) => `${album}-${String(i + 1).padStart(3, '0')}`);
  const PHOTOS = window.PHOTOS || {};
  const keyOf = id => (window.photoKey && window.photoKey(album, id)) || id;   // "dc-003" → "DC 138"
  const src = id => (PHOTOS[id] || PHOTOS[keyOf(id)] || {}).src || `p/${id}.webp`;
  const cityOf = id => (PHOTOS[keyOf(id)] || {}).city || '';
  // All cities: only pair photos from two different cities, and favour the ones doing best overall.
  const crossCity = album === 'all';
  const allow = (a, b) => !crossCity || cityOf(a) !== cityOf(b);
  const strength = {};   // id → 0..1 from the pooled ranking (All cities only)
  const $ = s => document.querySelector(s);

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  let voter = store.get('vote-voter', null);
  if (!voter) { voter = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set('vote-voter', voter); }

  const myVotesKey = `vote-${album}-mine`;
  let myVotes = store.get(myVotesKey, []);          // [[winner, loser], ...] — kept for the offline fallback
  const seenPairs = new Set(myVotes.map(([a, b]) => [a, b].sort().join('|')));
  const shows = Object.fromEntries(ids.map(id => [id, 0]));

  // No right-click / drag / long-press save on the photos.
  document.addEventListener('contextmenu', e => { if (e.target.closest('.pick, .tile')) e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (e.target.closest('.pick, .tile')) e.preventDefault(); });

  async function fetchStats() {
    if (!API) return null;
    try {
      const r = await fetch(`${API}/stats?album=${album}`, { cache: "no-store" });
      if (!r.ok) throw 0;
      return await r.json();
    } catch { return null; }
  }
  function localStats() {
    const photos = {};
    for (const [w, l] of myVotes) {
      (photos[w] ||= { wins: 0, shows: 0 }).wins++; photos[w].shows++;
      (photos[l] ||= { wins: 0, shows: 0 }).shows++;
    }
    return { photos, votes: myVotes.length, voters: myVotes.length ? 1 : 0, local: true };
  }

  // ---------- voting ----------
  const pickA = $('#pickA'), pickB = $('#pickB');
  let current = null, next = null, busy = false;

  // Favour photos that have been seen least, so every photo gets a fair number of match-ups.
  function weightedPick(exclude) {
    let total = 0;
    const w = ids.map(id => { const x = id === exclude ? 0 : 1 / (1 + shows[id]) ** 2; total += x; return x; });
    let r = Math.random() * total;
    for (let i = 0; i < ids.length; i++) { r -= w[i]; if (r <= 0) return ids[i]; }
    return ids[ids.length - 1];
  }
  let allPairs = 0;
  for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) if (allow(ids[i], ids[j])) allPairs++;
  // Lower = shown sooner: least-seen pairs first, and on All cities, strong photos get more turns.
  const priority = ([a, b]) => (shows[a] + shows[b]) / ((1 + 3 * (strength[a] ?? 0.5) ** 2) * (1 + 3 * (strength[b] ?? 0.5) ** 2));
  const key = p => [...p].sort().join('|');
  // A pair is off the table if already voted/skipped, or it's the one on screen right now.
  const taken = p => seenPairs.has(key(p)) || (current && key(p) === key(current));
  function makePair() {
    if (seenPairs.size >= allPairs) return null;              // small sets: every pair done
    if (count <= 40) {                                        // small sets: pick among unseen pairs, least-shown first
      const open = [];
      for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++)
        if (allow(ids[i], ids[j]) && !taken([ids[i], ids[j]])) open.push([ids[i], ids[j]]);
      if (!open.length) return null;
      open.sort((x, y) => priority(x) - priority(y) || Math.random() - 0.5);
      const pool = open.slice(0, Math.max(1, Math.ceil(open.length / 3)));
      const pr = pool[Math.floor(Math.random() * pool.length)];
      return Math.random() < 0.5 ? pr : [pr[1], pr[0]];
    }
    for (let tries = 0; tries < 30; tries++) {
      const a = weightedPick(null), b = weightedPick(a);
      if (allow(a, b) && !taken([a, b])) return [a, b];
    }
    const a = weightedPick(null); return [a, weightedPick(a)];
  }
  // Preload a pair and remember each photo's shape (width / height).
  const ratio = {};
  const preload = pair => Promise.all(pair.map(id => new Promise(res => {
    if (ratio[id]) return res();
    const i = new Image();
    i.onload = () => { ratio[id] = i.naturalWidth / i.naturalHeight; res(); };
    i.onerror = () => { ratio[id] = 1.5; res(); };
    i.src = src(id);
  })));

  // Give both photos the same height, as big as fits, so neither looks "bigger" and none is cropped.
  function layout() {
    if (!current || current.some(id => !ratio[id])) return;
    const box = $('.pair'), W = box.clientWidth, gap = 12;
    const stacked = window.innerWidth <= 700;
    const [r1, r2] = current.map(id => ratio[id]);
    const top = box.getBoundingClientRect().top + window.scrollY;
    let h;
    if (stacked) {
      const avail = Math.max(440, window.innerHeight - Math.min(top, 160) - 70);
      h = Math.min(W / Math.max(r1, r2), (avail - 10) / 2);
    } else {
      const avail = Math.max(320, Math.min(window.innerHeight - 150, 760));
      h = Math.min((W - gap) / (r1 + r2), avail);
    }
    [pickA, pickB].forEach((el, i) => { el.style.height = h + 'px'; el.style.width = h * [r1, r2][i] + 'px'; });
  }
  window.addEventListener('resize', layout);

  function show(pair) {
    current = pair;
    $('#done').hidden = !!pair; $('.pair').hidden = !pair; $('#skip').hidden = !pair;
    if (!pair) { document.body.classList.remove('loading'); return; }
    preload(pair).then(() => {
      if (current !== pair) return;
      [pickA, pickB].forEach((el, i) => {
        el.classList.remove('won', 'lost');
        el.querySelector('.photo').style.backgroundImage = `url("${src(pair[i])}")`;
      });
      layout();
      document.body.classList.remove('loading');
    });
    next = makePair();
    if (next) preload(next);
  }

  async function choose(i) {
    if (busy || !current) return;
    busy = true;
    const winner = current[i], loser = current[1 - i];
    [pickA, pickB][i].classList.add('won');
    [pickA, pickB][1 - i].classList.add('lost');
    record(winner, loser);
    await Promise.all([next ? preload(next) : 0, new Promise(r => setTimeout(r, 260))]);
    show(next);
    busy = false;
  }
  function skip() {
    if (busy || !current) return;
    current.forEach(id => shows[id]++);
    seenPairs.add([...current].sort().join('|'));   // don't offer the same pair again this visit
    show(next || makePair());
  }

  function record(winner, loser) {
    shows[winner]++; shows[loser]++;
    seenPairs.add([winner, loser].sort().join('|'));
    myVotes.push([winner, loser]); store.set(myVotesKey, myVotes.slice(-2000));
    updateCount();
    if (API) fetch(`${API}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ album, winner, loser, voter }),
    }).catch(() => {});
  }
  function updateCount() {
    $('#count').textContent = myVotes.length;
    $('#toTop').hidden = myVotes.length < Math.min(10, allPairs);
  }

  // ---------- top picks ----------
  // Pools every vote on the same real photo across all vote pages (photos.js), then scores with rank.js
  // (Bradley–Terry fit + bootstrap). Each page shows its own photos; chances are among those photos.
  async function loadPooled() {
    const KEYS = window.PHOTO_ALBUMS_KEYS || {};
    let d = null;
    if (API) try { const r = await fetch(`${API}/all`, { cache: 'no-store' }); if (r.ok) d = await r.json(); } catch {}
    let local = false;
    if (!d) {
      local = true;
      const m = {}; for (const [w, l] of myVotes) m[w + '|' + l] = (m[w + '|' + l] || 0) + 1;
      d = { albums: { [album]: Object.entries(m).map(([k, n]) => [...k.split('|'), n]) }, votes: myVotes.length, voters: myVotes.length ? 1 : 0 };
    }
    const pairs = [];
    for (const [alb, list] of Object.entries(d.albums || {})) {
      if (!KEYS[alb]) continue;
      for (const [w, l, n] of list) {
        const kw = window.photoKey(alb, w), kl = window.photoKey(alb, l);
        if (kw && kl) pairs.push([kw, kl, n]);
      }
    }
    return { keys: Object.keys(PHOTOS), pairs, votes: d.votes, voters: d.voters, local };
  }
  // Photos only ever compared within a group that's cut off from the rest can't be placed against it.
  function mainGroup(keys, pairs, mine) {
    const parent = Object.fromEntries(keys.map(k => [k, k]));
    const find = k => parent[k] === k ? k : (parent[k] = find(parent[k]));
    for (const [a, b] of pairs) if (a in parent && b in parent) parent[find(a)] = find(b);
    const size = {};
    for (const k of mine) size[find(k)] = (size[find(k)] || 0) + 1;
    const top = Object.entries(size).sort((x, y) => y[1] - x[1])[0];
    return new Set(mine.filter(k => top && find(k) === top[0]));
  }
  const pctTxt = p => p >= 0.995 ? '>99%' : p < 0.01 ? '<1%' : `${Math.round(p * 100)}%`;
  function verdict(r) {
    if (!r.linked) return ['early', 'Not linked yet'];
    if (r.shows < 10) return ['early', 'Too early'];
    if (r.pTop3 >= 0.9) return ['safe', 'Safe pick'];
    if (r.pTop3 >= 0.5) return ['likely', 'Likely top 3'];
    if (r.pTop3 < 0.02 && r.high < 50) return ['skip', 'Skip'];
    return ['', ''];
  }
  const caption = k => { const p = PHOTOS[k]; if (!p) return k; const i = ids.findIndex(id => keyOf(id) === k);
    return `${crossCity || i < 0 ? p.city : 'Photo #' + (i + 1)} · ${k.split(' ').pop()}`; };
  async function renderTop() {
    const grid = $('#grid');
    grid.innerHTML = '<p class="empty">Loading…</p>';
    const d = await loadPooled();
    const mine = [...new Set(ids.map(keyOf))];
    const used = d.pairs.filter(([a, b]) => mine.includes(a) || mine.includes(b)).reduce((t, x) => t + x[2], 0);
    $('#boardMeta').textContent = d.local
      ? 'Your picks only (live tally not reachable)'
      : `${used.toLocaleString()} votes on these photos · ${d.voters.toLocaleString()} people voting across all pages`;
    if (!used) { grid.innerHTML = '<p class="empty">No votes yet.</p>'; return; }
    await new Promise(r => setTimeout(r, 0));   // let "Loading…" paint before the number crunching
    const linked = mainGroup(d.keys, d.pairs, mine);
    const rows = window.rankPhotos(d.keys, d.pairs, { among: [...linked] })
      .map(r => ({ ...r, linked: true }));
    const rest = window.rankPhotos(d.keys, d.pairs, { among: mine.filter(k => !linked.has(k)), resamples: 0 })
      .map(r => ({ ...r, linked: false }));
    const all = [...rows, ...rest].filter(r => r.shows > 0).slice(0, 60);
    grid.innerHTML = all.map((r, i) => {
      const [cls, label] = verdict(r);
      return `
      <figure class="tile${r.linked ? '' : ' unlinked'}">
        <div class="img"><div class="photo" style="background-image:url('${src(r.id)}')"></div><div class="shield"></div>
          <span class="rank">${r.linked ? i + 1 : '–'}</span>${label ? `<span class="badge ${cls}">${label}</span>` : ''}</div>
        <figcaption>
          <div class="score"><b>${Math.round(r.score)}</b><span>likely ${Math.round(r.low)}–${Math.round(r.high)}</span></div>
          <div class="range" aria-hidden="true"><i style="left:${r.low}%;width:${Math.max(1, r.high - r.low)}%"></i><u style="left:${r.score}%"></u></div>
          <dl><div><dt>Chance #1</dt><dd>${r.linked ? pctTxt(r.pFirst) : '–'}</dd></div><div><dt>Top 3</dt><dd>${r.linked ? pctTxt(r.pTop3) : '–'}</dd></div><div><dt>Won</dt><dd>${r.wins}/${r.shows}</dd></div></dl>
          <span class="pid">${caption(r.id)}</span>
        </figcaption>
      </figure>`;
    }).join('');
  }

  // ---------- views ----------
  function route() {
    const top = location.hash === '#top';
    $('#voteView').hidden = top; $('#topView').hidden = !top;
    document.querySelectorAll('[data-view]').forEach(a => a.toggleAttribute('aria-current', (a.dataset.view === 'top') === top));
    if (top) renderTop(); else if (!current) show(makePair());
    window.scrollTo(0, 0);
  }

  pickA.addEventListener('click', () => choose(0));
  pickB.addEventListener('click', () => choose(1));
  $('#skip').addEventListener('click', skip);
  document.addEventListener('keydown', e => {
    if (location.hash === '#top' || e.metaKey || e.ctrlKey) return;
    if (e.key === 'ArrowLeft' || e.key === '1') choose(0);
    else if (e.key === 'ArrowRight' || e.key === '2') choose(1);
    else if (e.key === 's' || e.key === ' ') { e.preventDefault(); skip(); }
  });
  window.addEventListener('hashchange', route);

  // Seed exposure counts from the live tally so new visitors see under-voted photos first.
  fetchStats().then(s => { if (s) for (const [id, p] of Object.entries(s.photos)) if (id in shows) shows[id] += p.shows / Math.max(1, s.voters); });
  updateCount();
  // All cities: rank everything first so the strongest photos get more match-ups.
  const ready = crossCity ? loadPooled().then(d => {
    const fit = window.fitPhotos(d.keys, d.pairs);
    d.keys.forEach((k, i) => { const id = ids.find(x => keyOf(x) === k); if (id) strength[id] = fit[i] / 100; });
  }).catch(() => {}) : Promise.resolve();
  ready.then(route);
})();
