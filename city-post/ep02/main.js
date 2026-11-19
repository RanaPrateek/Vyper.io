// Episode 2: "We built it." Results of the Ep 1 vote, the first citizens' houses, the pigeon.
// Every shot and overlay is keyed to word times in timeline.json (from tools/align.py), so the
// visuals follow the narration rather than the other way round.
import {
  THREE, params, clamp, lerp, smooth, easeOut, easeInOut, easeOutBack, v3, VIEW, renderer, scene, camera,
  LOOKS, applyLook, HALF, SIGN_POS, SIGN_CENTER, sign, setSign, makeHouse, makeCarHouse, makeMansion, makeMall,
  makePigeon, plotMarker, project,
} from '../world.js';

const load = (f) => fetch(f).then((r) => r.json());
const [TL, CFG, STATE] = await Promise.all([load('./timeline.json'), load('./config.json'), load('../city/state.json')]);
export const DURATION = TL.duration;
const N = CFG.followers, PREV = CFG.previous_followers;

// ---------------------------------------------------------------- timing helpers
const BEAT = Object.fromEntries(TL.beats.map((b) => [b.id, b]));
/** time of the first word in beat `id` matching `re` (fallback: beat start + off) */
function W(id, re, off = 0) {
  const b = BEAT[id];
  const w = b.words.find(([x]) => re.test(x));
  return w ? w[1] : b.start + off;
}

// ---------------------------------------------------------------- the city (from city/state.json)
const homes = {};
const homeList = [];
for (const c of STATE.citizens) {
  const obj = c.house === 'car' ? makeCarHouse(c.name) : c.house === 'mansion' ? makeMansion(c.name)
    : makeHouse(c.name, { roof: c.roof ?? 0xd2653b, neon: c.house === 'neon' });
  obj.position.set(c.x, 0, c.z);
  scene.add(obj);
  homes[c.name] = obj; homeList.push(obj);
}
const at = (name, dx = 0, dy = 0, dz = 0) => homes[name].position.clone().add(v3(dx, dy, dz));

const MALL_POS = v3(-25, 0, 25);
const mall = makeMall('GIANT MALL'); mall.position.copy(MALL_POS); scene.add(mall);

const pigeon = makePigeon(); pigeon.position.set(2.2, 10.0, 0.05); pigeon.rotation.y = 0.35; sign.add(pigeon);
const signFront = v3(Math.sin(-0.38), 0, Math.cos(-0.38));
const signRight = v3(Math.cos(-0.38), 0, -Math.sin(-0.38));
sign.updateMatrixWorld(true);
const PIGEON_WORLD = sign.localToWorld(v3(2.2, 11.0, 0.05));

const VOTE = [v3(-25, 0.06, -75), v3(-25, 0.06, -25), v3(-25, 0.06, 25)];      // A hospital, B stadium, C mall
const NEXT = [v3(25, 0.06, -75), v3(25, 0.06, -25), v3(25, 0.06, 25)];         // next vote
const voteMarks = VOTE.map((p, i) => { const m = plotMarker('ABC'[i]); m.position.copy(p).add(v3(0, 0.05, 0)); scene.add(m); return m; });
const nextMarks = NEXT.map((p, i) => { const m = plotMarker('ABC'[i]); m.position.copy(p).add(v3(0, 0.05, 0)); scene.add(m); return m; });

// ---------------------------------------------------------------- cue times
const T = {
  today: W('hook', /^Today/, 2.8),
  housesPop: BEAT.houses.start + 1.0,
  stadium: W('vote', /^Stadium/, 1), hospital: W('vote', /^Hospital/, 2.5), mallWin: W('vote', /^\d+%\.$/, 5) ,
  pigeonIn: BEAT.pigeon.start + 0.7, nameHim: W('pigeon', /^Name/, 5),
  tagA: W('next', /^A,/, 1), tagB: W('next', /^B,/, 2), tagC: W('next', /^C,/, 3),
};
// "73%." is the last % word in the vote beat
{ const pct = BEAT.vote.words.filter(([x]) => /%/.test(x)); if (pct.length) T.mallWin = pct[pct.length - 1][1]; }
T.mallRise = T.mallWin + 0.35;
const popAt = (i) => T.housesPop + i * 0.2;

// ---------------------------------------------------------------- shots
const P = (x, y, z) => v3(x, y, z);
const SHOTS = [
  { beat: 'hook', pill: `DAY ${CFG.day}`, title: (t) => (t < T.today - 0.1 ? 'TWO DAYS AGO' : 'TODAY'), look: 'day',
    cam: [P(7.0, 6.6, HALF + 84), P(8.5, 6.7, HALF + 79)], at: [SIGN_CENTER.clone().add(v3(-1, 0, 0)), SIGN_CENTER.clone().add(v3(0.4, 0, 0))], span: 60 },
  { beat: 'houses', pill: 'YOU ASKED', title: `WE BUILT ${STATE.citizens.length} HOUSES`, look: 'day',
    cam: [P(78, 58, 470), P(60, 50, 440)], at: [P(0, 0, 350), P(0, 0, 338)], span: 120 },
  { beat: 'kasparita', pill: 'CITIZEN #1', title: 'HOUSE NUMBER ONE', look: 'day', card: ['Kasparita'],
    cam: [at('Kasparita', 9, 5, 20), at('Kasparita', 5, 4.2, 14)], at: [at('Kasparita', 0, 3.2, 0), at('Kasparita', 0, 3.2, 0)], span: 50 },
  { beat: 'tamara', pill: 'TAMARA ASKED', title: 'NEON PINK', look: 'dusk', card: ['Tamara'], space: true,
    cam: [at('Tamara', 6, 4, 16), at('Tamara', 0, 190, 30)], at: [at('Tamara', 0, 3, 0), at('Tamara', 0, 0, 0)], span: 60 },
  { beat: 'emilia', pill: 'EMILIA ASKED', title: 'HOME SWEET CAR', look: 'day', card: ['Emilia🦖'],
    cam: [at('Emilia🦖', -7, 3.6, 15), at('Emilia🦖', -4.5, 3.1, 11.5)], at: [at('Emilia🦖', 0, 2.2, 0), at('Emilia🦖', 0, 2.2, 0)], span: 40 },
  { beat: 'christina', pill: 'CHRISTINA ASKED', title: 'THE MANSION', look: 'day', card: ['christinas_privvvv'],
    cam: [at('christinas_privvvv', 18, 10, 44), at('christinas_privvvv', 11, 8, 34)], at: [at('christinas_privvvv', 0, 5, 0), at('christinas_privvvv', 0, 5, 0)], span: 60 },
  { beat: 'sophias', pill: 'NEIGHBOURS', title: 'SOPHIA & SOPHIA', look: 'day', card: ['Sophia_w💕', 'Sophia🦢🧁'],
    cam: [P(-25, 4.6, 404), P(-25, 4.2, 397)], at: [P(-25, 3.4, 366), P(-25, 3.4, 366)], span: 60 },
  { beat: 'erinn', pill: 'ERINN SAID', title: 'FAIR ENOUGH', look: 'day', card: ['erinn🤍'],
    cam: [at('erinn🤍', -6, 4.5, 18), at('erinn🤍', -3.5, 4, 12.5)], at: [at('erinn🤍', 0, 3.2, 0), at('erinn🤍', 0, 3.2, 0)], span: 50 },
  { beat: 'vote', pill: 'THE VOTE', title: 'RESULTS', look: 'day', vote: true, topdown: true,
    cam: [P(-6, 300, -12), P(-9, 262, -20)], at: [P(-6, 0, -14), P(-9, 0, -22)], span: 200 },
  { beat: 'priya', pill: 'THE WINNER', title: 'GIANT MALL', look: 'golden', card: ['Priya'], orbit: { c: MALL_POS, r: [100, 86], a: [0.2, 0.6], h: [34, 27], y: 11 }, span: 80 },
  { beat: 'pigeon', pill: 'NEW RESIDENT', title: (t) => (t < T.nameHim - 0.1 ? 'UNINVITED' : 'NAME HIM?'), look: 'day', pigeon: true,
    cam: [PIGEON_WORLD.clone().addScaledVector(signFront, 9).add(signRight.clone().multiplyScalar(2.5)).add(v3(0, 0.6, 0)),
          PIGEON_WORLD.clone().addScaledVector(signFront, 6.2).add(signRight.clone().multiplyScalar(1.6)).add(v3(0, 0.4, 0))],
    at: [PIGEON_WORLD.clone().add(v3(0, -0.6, 0)), PIGEON_WORLD.clone().add(v3(0, -0.3, 0))], span: 30 },
  { beat: 'milestone', pill: 'NEXT MILESTONE', title: 'ELECTRICITY', look: 'dusk', progress: true,
    cam: [P(110, 85, 470), P(92, 72, 440)], at: [P(-8, 0, 290), P(-8, 0, 280)], span: 230 },
  { beat: 'next', pill: 'NEXT VOTE', title: 'A, B OR C?', look: 'day', next: true, topdown: true,
    cam: [P(44, 300, -12), P(41, 262, -20)], at: [P(44, 0, -14), P(41, 0, -22)], span: 200 },
  { beat: 'end', pill: 'PAUSE &', title: 'FIND YOUR NAME', look: 'golden', wall: true, orbit: { c: P(0, 0, 330), r: [150, 135], a: [0.9, 1.15], h: [70, 60], y: 0 }, span: 220 },
];
SHOTS.forEach((s, i) => {
  s.t0 = i === 0 ? 0 : BEAT[s.beat].start - 0.12;
  s.t1 = i + 1 < SHOTS.length ? BEAT[SHOTS[i + 1].beat].start - 0.12 : TL.voice_end + 0.15;
});
const END_T0 = SHOTS[SHOTS.length - 1].t1;

// ---------------------------------------------------------------- captions (2–4 word chunks)
const CHUNKS = [];
for (const b of TL.beats) {
  let chunk = [];
  b.words.forEach(([w, st], i) => {
    chunk.push([w, st]);
    const letters = chunk.map(([x]) => x).join(' ').length;
    const nx = b.words[i + 1];
    if (/[,.:?!]$/.test(w) || chunk.length >= 3 || (nx && letters + 1 + nx[0].length > 18)) { chunk.end = b.end; CHUNKS.push(chunk); chunk = []; }
  });
  if (chunk.length) { chunk.end = b.end; CHUNKS.push(chunk); }
}

// ---------------------------------------------------------------- DOM
const $ = (id) => document.getElementById(id);
const ui = { pill: $('pill'), title: $('title'), caption: $('caption'), big: $('bigNum'), bigN: $('bigN'), cards: [$('card0'), $('card1')],
  results: $('results'), tags: $('tags'), progress: $('progress'), pfill: $('pfill'), pcount: $('pcount'), wall: $('wall'), end: $('end') };
if (params.has('clean')) $('ui').style.display = 'none';
$('endK').textContent = `EPISODE ${CFG.episode} · DAY ${CFG.day}`;
$('endPop').textContent = `Population: ${N.toLocaleString('en-US')}`;
$('wallGrid').innerHTML = STATE.citizens.map((c) => `<div class="nm">${c.name}</div>`).join('');
$('progress').querySelector('.label').textContent = `⚡ AT ${CFG.milestone.target}: ${CFG.milestone.label}`;

const AV = ['#3a6ee8', '#e8578a', '#2fb07a', '#e89a2f', '#8a5ae8', '#2fa8c8'];
function cardHtml(name) {
  const c = STATE.citizens.find((x) => x.name === name);
  const initial = [...name].find((ch) => /[A-Za-z0-9]/.test(ch)) || '★';
  const col = AV[[...name].reduce((a, ch) => a + ch.codePointAt(0), 0) % AV.length];
  return `<span class="tag">THEY COMMENTED</span><div class="row"><div class="av" style="background:${col}">${initial.toUpperCase()}</div>
    <div class="txt"><div class="user">${name}</div><div class="body">${c.comment}</div></div>
    <div class="likes"><span class="heart">&#9829;</span>${c.likes || ''}</div></div>`;
}
const RESULTS = [ // shown lowest to highest
  { i: 1, label: 'STADIUM', pct: CFG.poll.Stadium, t: () => T.stadium },
  { i: 0, label: 'HOSPITAL', pct: CFG.poll.Hospital, t: () => T.hospital },
  { i: 2, label: 'GIANT MALL', pct: CFG.poll['Giant mall'], t: () => T.mallWin, win: true },
];
ui.results.innerHTML = RESULTS.map((r, k) => `<div class="rpill${r.win ? ' win' : ''}" id="rp${k}">${r.pct}%<small>${r.label}</small></div>`).join('') + '<div class="crown" id="crown">👑</div>';
const tagT = () => [T.tagA, T.tagB, T.tagC];
ui.tags.innerHTML = CFG.next_vote.map((l, i) => `<div class="vtag" id="vt${i}">${'ABC'[i]} · ${l}</div>`).join('');

let lastTitle = '', lastCaption = '', lastCards = '';
function setTitle(text) {
  if (text === lastTitle) return;
  lastTitle = text; ui.title.innerHTML = `<span>${text}</span>`; ui.title.style.fontSize = '76px';
  let fs = 76; const sp = ui.title.firstChild;
  while (sp.offsetWidth > 860 && fs > 40) { fs -= 2; ui.title.style.fontSize = fs + 'px'; }
}

// ---------------------------------------------------------------- frame
export function setTime(t) {
  const endcard = t >= END_T0;
  ui.end.style.display = endcard ? 'flex' : 'none';
  if (endcard) {
    for (const el of [ui.pill, ui.title, ui.caption, ui.big, ui.progress, ui.wall]) el.style.display = 'none';
    ui.cards.forEach((c) => (c.style.display = 'none'));
    const lp = easeOutBack((t - (END_T0 + 1.04)) / 0.4);
    $('endLogo').style.transform = `scale(${Math.max(0, 0.3 + 0.7 * lp)})`;
    $('endLogo').style.opacity = clamp((t - (END_T0 + 0.95)) / 0.1);
    ui.end.style.opacity = clamp((t - END_T0) / 0.3);
    return;
  }
  ui.pill.style.display = ui.title.style.display = ui.caption.style.display = 'block';

  const shot = SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0)), since = t - shot.t0;

  // ---- world state
  const count = t < T.today ? PREV : Math.round(PREV + (N - PREV) * easeOut((t - T.today) / 1.2));
  setSign(count);
  homeList.forEach((h, i) => {
    const s = t < T.housesPop - 0.5 ? 0 : easeOutBack((t - popAt(i)) / 0.45);
    h.visible = s > 0.001; h.scale.setScalar(Math.max(s, 0.001));
  });
  const rise = clamp((t - T.mallRise) / 1.6);
  mall.visible = rise > 0.001;
  mall.userData.body.scale.set(1, Math.max(easeInOut(rise), 0.001), 1);
  mall.userData.sign.visible = rise > 0.95;
  mall.userData.sign.scale.setScalar(easeOutBack((t - T.mallRise - 1.6) / 0.4) || 0.001);
  const pg = easeOutBack((t - T.pigeonIn) / 0.5);
  pigeon.visible = pg > 0.001; pigeon.scale.setScalar(Math.max(pg, 0.001));
  pigeon.userData.animate(t);
  voteMarks.forEach((m, i) => { m.visible = !!shot.vote && !(i === 2 && rise > 0.05); });
  nextMarks.forEach((m) => { m.visible = !!shot.next; });

  // ---- camera
  let focus;
  if (shot.orbit) {
    const o = shot.orbit, e = smooth(k);
    const ang = lerp(o.a[0], o.a[1], e), r = lerp(o.r[0], o.r[1], e), h = lerp(o.h[0], o.h[1], e);
    camera.position.set(o.c.x + Math.sin(ang) * r, h, o.c.z + Math.cos(ang) * r);
    camera.up.set(0, 1, 0); camera.lookAt(o.c.x, o.y, o.c.z); focus = o.c.clone();
  } else {
    const e = shot.space ? (k < 0.45 ? 0 : easeInOut((k - 0.45) / 0.55)) : smooth(k) * 0.6 + k * 0.4;
    camera.position.lerpVectors(shot.cam[0], shot.cam[1], e);
    const tgt = new THREE.Vector3().lerpVectors(shot.at[0], shot.at[1], e);
    if (shot.topdown) camera.up.set(Math.sin(0.12), 0, -Math.cos(0.12)); else camera.up.set(0, 1, 0);
    camera.lookAt(tgt); focus = tgt.clone().setY(0);
  }
  camera.fov = 52 - 3 * (1 - easeOut(since / 0.35)) * (shot.t0 === 0 ? 0 : 1);
  camera.updateProjectionMatrix();
  applyLook(LOOKS[shot.look], focus, shot.span);
  renderer.render(scene, camera);

  // ---- titles
  ui.pill.textContent = shot.pill;
  setTitle(typeof shot.title === 'function' ? shot.title(t) : shot.title);
  const pop = shot.t0 === 0 ? 1 : easeOutBack(since / 0.3);
  ui.title.style.transform = `scale(${0.85 + 0.15 * pop})`;
  ui.pill.style.transform = `translateX(-50%) scale(${0.85 + 0.15 * pop})`;

  // big population number (hook)
  const bigOn = shot.beat === 'hook' && t >= T.today;
  ui.big.style.display = bigOn ? 'block' : 'none';
  if (bigOn) { ui.bigN.textContent = count.toLocaleString('en-US'); ui.big.style.transform = `scale(${0.6 + 0.4 * easeOutBack((t - T.today) / 0.35)})`; }

  // comment cards
  const cards = shot.card ? shot.card.join('|') : '';
  if (cards !== lastCards) { lastCards = cards; (shot.card || []).forEach((n, i) => (ui.cards[i].innerHTML = cardHtml(n))); }
  ui.cards.forEach((el, i) => {
    const name = shot.card && shot.card[i];
    const t0 = shot.t0 + 0.35 + i * 0.5;
    const on = !!name && t >= t0;
    el.style.display = on ? 'block' : 'none';
    if (on) { const p = easeOutBack((t - t0) / 0.35); el.style.transform = `translateX(-50%) scale(${0.6 + 0.4 * p})`; el.style.opacity = clamp(p * 1.5); }
  });

  // results (vote shot): pills to the right of each plot, lowest first, crown on the winner
  RESULTS.forEach((r, kk) => {
    const el = $('rp' + kk), on = !!shot.vote && t >= r.t();
    el.style.display = on ? 'block' : 'none';
    if (on) { const s = project(VOTE[r.i].clone().add(v3(21, 0, 0))); el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
      el.style.transform = `translate(0,-50%) scale(${0.5 + 0.5 * easeOutBack((t - r.t()) / 0.3)})`; }
  });
  const crownOn = !!shot.vote && t >= T.mallWin + 0.2;
  $('crown').style.display = crownOn ? 'block' : 'none';
  if (crownOn) { const s = project(VOTE[2].clone().add(v3(30, 0, -7))); $('crown').style.left = s.x + 'px'; $('crown').style.top = s.y + 'px';
    $('crown').style.transform = `translate(-50%,-100%) scale(${easeOutBack((t - T.mallWin - 0.2) / 0.35)}) rotate(-12deg)`; }

  // next vote tags
  tagT().forEach((tt, i) => {
    const el = $('vt' + i), on = !!shot.next && t >= tt;
    el.style.display = on ? 'block' : 'none';
    if (on) { const s = project(NEXT[i].clone().add(v3(21, 0, 0))); el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
      el.style.transform = `translate(0,-50%) scale(${0.5 + 0.5 * easeOutBack((t - tt) / 0.3)})`; }
  });

  // milestone progress
  ui.progress.style.display = shot.progress ? 'block' : 'none';
  if (shot.progress) {
    const f = easeOut((t - shot.t0 - 0.5) / 1.5) * Math.min(1, N / CFG.milestone.target);
    ui.pfill.style.width = (f * 100).toFixed(2) + '%';
    ui.pcount.textContent = `${Math.round(f * CFG.milestone.target)} / ${CFG.milestone.target}`;
  }

  // founders' wall
  ui.wall.style.display = shot.wall ? 'block' : 'none';
  if (shot.wall) { const p = easeOutBack(since / 0.4); ui.wall.style.transform = `scale(${0.8 + 0.2 * p})`; ui.wall.style.opacity = clamp(p * 1.4); }

  // captions
  let html = '';
  let ci = -1; for (let i = 0; i < CHUNKS.length; i++) if (CHUNKS[i][0][1] <= t) ci = i;
  if (ci >= 0) {
    const words = CHUNKS[ci];
    if (t < words.end + 0.25) {
      let wi = 0; for (let i = 0; i < words.length; i++) if (words[i][1] <= t) wi = i;
      html = words.map(([w], i) => (i === wi ? `<span class="hl">${w}</span>` : w)).join(' ');
    }
  }
  if (html !== lastCaption) {
    lastCaption = html; ui.caption.innerHTML = html; ui.caption.style.fontSize = '60px';
    let fs = 60; while (ui.caption.scrollWidth > ui.caption.clientWidth + 2 && fs > 40) { fs -= 2; ui.caption.style.fontSize = fs + 'px'; }
  }
}

window.setTime = setTime;
window.DURATION = DURATION;
window.sceneReady = document.fonts.ready.then(() => { setSign(PREV); return true; });
if (!params.has('render')) {
  window.sceneReady.then(() => { const t0 = performance.now(); const loop = () => { setTime(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); }; loop(); });
}
