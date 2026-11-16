// Photo face-off: show two photos, the visitor taps the one they'd rather click on, repeat.
// Each pick is sent to the vote API (vote/config.js). "Top picks" ranks photos by how often they win.
(function () {
  const { album, count } = window.VOTE;
  const API = (window.VOTE_API || '').replace(/\/$/, '');
  const ids = Array.from({ length: count }, (_, i) => `${album}-${String(i + 1).padStart(3, '0')}`);
  const src = id => `p/${id}.webp`;
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
  const allPairs = count * (count - 1) / 2;
  const key = p => [...p].sort().join('|');
  // A pair is off the table if already voted/skipped, or it's the one on screen right now.
  const taken = p => seenPairs.has(key(p)) || (current && key(p) === key(current));
  function makePair() {
    if (seenPairs.size >= allPairs) return null;              // small sets: every pair done
    if (count <= 40) {                                        // small sets: pick among unseen pairs, least-shown first
      const open = [];
      for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++)
        if (!taken([ids[i], ids[j]])) open.push([ids[i], ids[j]]);
      if (!open.length) return null;
      open.sort((x, y) => (shows[x[0]] + shows[x[1]]) - (shows[y[0]] + shows[y[1]]) || Math.random() - 0.5);
      const pool = open.slice(0, Math.max(1, Math.ceil(open.length / 3)));
      const pr = pool[Math.floor(Math.random() * pool.length)];
      return Math.random() < 0.5 ? pr : [pr[1], pr[0]];
    }
    for (let tries = 0; tries < 30; tries++) {
      const a = weightedPick(null), b = weightedPick(a);
      if (!taken([a, b])) return [a, b];
    }
    const a = weightedPick(null); return [a, weightedPick(a)];
  }
  const preload = pair => Promise.all(pair.map(id => new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = src(id); })));

  function show(pair) {
    current = pair;
    $('#done').hidden = !!pair; $('.pair').hidden = !pair; $('#skip').hidden = !pair;
    if (!pair) { document.body.classList.remove('loading'); return; }
    [pickA, pickB].forEach((el, i) => {
      el.classList.remove('won', 'lost');
      el.querySelector('.photo').style.backgroundImage = `url("${src(pair[i])}")`;
    });
    document.body.classList.remove('loading');
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
  // Score = smoothed win rate, so a photo that won 1 of 1 doesn't beat one that won 18 of 20.
  const score = p => (p.wins + 1) / (p.shows + 2);
  async function renderTop() {
    const grid = $('#grid');
    grid.innerHTML = '<p class="empty">Loading…</p>';
    const s = (await fetchStats()) || localStats();
    const rows = Object.entries(s.photos).filter(([, p]) => p.shows >= 3)
      .sort((a, b) => score(b[1]) - score(a[1]) || b[1].shows - a[1].shows).slice(0, 48);
    $('#boardMeta').textContent = s.local
      ? 'Your picks only (live tally not connected yet)'
      : `${s.votes.toLocaleString()} vote${s.votes === 1 ? '' : 's'} from ${s.voters.toLocaleString()} ${s.voters === 1 ? 'person' : 'people'}`;
    if (!rows.length) { grid.innerHTML = '<p class="empty">Not enough votes yet. Each photo needs to be shown at least 3 times.</p>'; return; }
    grid.innerHTML = rows.map(([id, p], i) => `
      <div class="tile"><div class="photo" style="background-image:url('${src(id)}')"></div><div class="shield"></div>
        <span class="rank">${i + 1}</span>
        <span class="meta"><span>#${id.split('-')[1]}</span><span>won ${p.wins}/${p.shows}</span></span></div>`).join('');
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
  route();
})();
