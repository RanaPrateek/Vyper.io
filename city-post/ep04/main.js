// Episode 4: "Lights on." The night episode: lights switch on, the where's-my-house montage,
// the water park, Queen R's castle, the never-give-up crowd, quick specials, next vote.
import {
  THREE, params, clamp, lerp, smooth, easeOut, easeInOut, easeOutBack, v3, renderer, scene, camera,
  LOOKS, applyLook, HALF, SIGN_CENTER, sign, setSign, makeHouse, makeCarHouse, makeMansion, makeMall,
  makePigeon, plotMarker, project, makeHouseField, makeVilla, makeDistrict, makeCinema, makeNeonExtension,
  makePotatoHouse, makeDuckHouse, makeShoeHouse, makeOstrichHouse, makeNuggetHouse, makePigeonStatue, floatingTag,
  setCityLights, christmasLights, makeWaterPark, makeCastle, makeCheeseHouse, makeKebabShop, makeTacoHouse,
  makeRainbowNeonHouse, makeCrystalTree,
} from '../world.js';

const load = (f) => fetch(f).then((r) => r.json());
const [TL, CFG, STATE] = await Promise.all([load('./timeline.json'), load('./config.json'), load('../city/state.json')]);
export const DURATION = TL.duration;
const N = CFG.followers, PREV = CFG.previous_followers, EP = CFG.episode;
const BEAT = Object.fromEntries(TL.beats.map((b) => [b.id, b]));
const W = (id, re, off = 0) => { const w = BEAT[id].words.find(([x]) => re.test(x)); return w ? w[1] : BEAT[id].start + off; };

// ---------------------------------------------------------------- the city (everything from state.json)
const byName = Object.fromEntries(STATE.citizens.map((c) => [c.name, c]));
const objs = {}, newSpecial = [], fieldEntries = [], fieldIndex = {};
const MAKERS = { potato: makePotatoHouse, duck: makeDuckHouse, shoe: makeShoeHouse, ostrich: makeOstrichHouse, nugget: makeNuggetHouse,
  statue: makePigeonStatue, castle: makeCastle, cheese: makeCheeseHouse, kebab: makeKebabShop, taco: makeTacoHouse,
  rainbow: makeRainbowNeonHouse, crystal: makeCrystalTree };
for (const c of STATE.citizens) {
  let o = null;
  if (c.house === 'house' && c.since_episode >= 3 && !c.tiny) { fieldIndex[c.name] = fieldEntries.length; fieldEntries.push({ name: c.name, x: c.x, z: c.z, roof: c.roof, wall: c.wall }); continue; }
  if (c.house === 'house' || c.house === 'neon') o = makeHouse(c.name, { roof: c.roof ?? 0xd2653b, neon: c.house === 'neon' });
  else if (c.house === 'tiny') o = makeHouse(c.name, { roof: 0xe0b23a, scale: 0.12 });
  else if (c.house === 'car') o = makeCarHouse(c.name);
  else if (c.house === 'mansion') o = makeMansion(c.name);
  else if (c.house === 'villa') o = makeVilla(c.name);
  else if (c.house === 'kebab') o = makeKebabShop('chris');
  else if (c.house === 'castle') o = makeCastle('R');
  else o = MAKERS[c.house](c.name);
  o.position.set(c.x, c.y || 0, c.z); if (c.scale) o.scale.setScalar(c.scale);
  o.userData.baseScale = c.scale || 1;
  scene.add(o); objs[c.name] = o;
  if (c.since_episode === EP) newSpecial.push(o);
}
const field = makeHouseField(fieldEntries); scene.add(field.group);
const tam = byName.Tamara; const ext = makeNeonExtension(tam.extension.colour); ext.position.set(tam.x - 7.4, 0, tam.z + 0.5); scene.add(ext);
const emi = byName.Emijinx; const xmas = christmasLights(); xmas.position.set(emi.x, 0, emi.z); scene.add(xmas);
const mall = makeMall('GIANT MALL'); mall.position.set(-25, 0, 25); scene.add(mall);
const cinema = makeCinema('CINEMA'); cinema.position.set(25, 0, 25); scene.add(cinema);
const hillB = STATE.buildings.find((b) => b.id === 'billionaires_hill');
scene.add(makeDistrict(hillB.x, hillB.z, hillB.w, hillB.d, hillB.h, "BILLIONAIRES' HILL"));
const kb = STATE.buildings.find((b) => b.id === 'kebab'); const kebab = makeKebabShop(kb.boss); kebab.position.set(kb.x, 0, kb.z); kebab.userData.baseScale = 1; scene.add(kebab); objs.KEBAB = kebab;
const WP = v3(-75, 0, -75);
const park = makeWaterPark('Ellis'); park.position.copy(WP); scene.add(park);

const pigeon = makePigeon(); pigeon.position.set(2.2, 10.0, 0.05); pigeon.rotation.y = 0.35; sign.add(pigeon);
const kevinTag = floatingTag('KEVIN', { height: 0.5 }); kevinTag.position.set(2.2, 12.3, 0.05); kevinTag.scale.set(1.6, 0.5, 1); sign.add(kevinTag);

const VOTE = [v3(-75, 0.06, -75), v3(-75, 0.06, -25), v3(-75, 0.06, 25)];   // A water park, B castle, C town centre
const NEXT = [v3(-25, 0.06, -125), v3(-25, 0.06, -75), v3(-25, 0.06, -25)];
const voteMarks = VOTE.map((p, i) => { const m = plotMarker('ABC'[i]); m.position.copy(p).add(v3(0, 0.05, 0)); scene.add(m); return m; });
const nextMarks = NEXT.map((p, i) => { const m = plotMarker('ABC'[i]); m.position.copy(p).add(v3(0, 0.05, 0)); scene.add(m); return m; });

// ---------------------------------------------------------------- cues
const T = {
  today: W('hook', /^Today/, 2.5), lightsOn: W('hook', /^lights/, 4.8),
  xmas: W('emijinx', /^Done/, 1.8),
  castle: W('vote', /^Castle/, 1), town: W('vote', /^Town/, 2),
  ellisTag: W('ellis', /^runs/, 1.6),
  queenUp: W('queen', /^Your$/, 5),
  cheese: W('asking', /^Fine/, 4), kebab: W('asking', /^boss/, 6),
  taco: W('quick', /^taco/, 5), tree: W('quick', /^Chlo/, 7), rainbow: W('quick', /^Penny/, 9),
  tagA: W('next', /^A,/, 1), tagB: W('next', /^B,/, 2), tagC: W('next', /^C,/, 3),
};
{ const pct = BEAT.vote.words.filter(([x]) => /%/.test(x)); T.win = pct.length ? pct[pct.length - 1][1] : BEAT.vote.end - 0.5; }
T.rise = T.win + 0.3;
const lightsK = (t) => { // flicker, then on
  if (t < T.lightsOn) return 0;
  const d = t - T.lightsOn;
  if (d < 0.12) return 0.8; if (d < 0.22) return 0.1; if (d < 0.32) return 1; if (d < 0.4) return 0.3;
  return clamp(0.6 + (d - 0.4) * 2);
};
const POPS = { 'R♡': () => T.queenUp, Arran: () => T.cheese, KEBAB: () => T.kebab, '~Skyla~': () => T.taco, chlo: () => T.tree, Penny: () => T.rainbow, Alex: () => 0 };

// ---------------------------------------------------------------- shots
const P = (x, y, z) => v3(x, y, z);
const frontCam = (x, z, h = 3.6, dist = 15, side = 3) => ({ cam: [P(x + side * 1.4, h + 1.6, z + dist * 1.15), P(x + side, h + 1.2, z + dist)], at: [P(x, h - 0.2, z), P(x, h - 0.2, z)] });
const houseXZ = (name) => { const c = byName[name]; return [c.x, c.z]; };
const montageSubs = CFG.montage.map((name) => {
  const w = BEAT.montage.words.find(([x]) => x.replace(/[^A-Za-z]/g, '').toLowerCase() === name.replace(/[^A-Za-z]/g, '').toLowerCase());
  const [x, z] = houseXZ(name); return { t: w ? w[1] - 0.1 : BEAT.montage.start, cam: [P(x + 2.5, 10.5, z + 13), P(x + 1.5, 9.4, z + 11)], at: [P(x, 3.6, z + 3.5), P(x, 3.6, z + 3.5)], name };
});
const objXZ = (name) => objs[name].position;
const SHOTS = [
  { beat: 'hook', pill: `DAY ${CFG.day}`, title: (t) => (t < T.today - 0.1 ? 'YESTERDAY' : t < T.lightsOn - 0.1 ? 'TODAY' : 'LIGHTS ON'), look: 'night', big: true,
    cam: [P(5.0, 7.5, HALF + 92), P(6.5, 7.6, HALF + 87)], at: [SIGN_CENTER.clone().add(v3(-1, 5.5, 0)), SIGN_CENTER.clone().add(v3(0.4, 5.5, 0))], span: 60 },
  { beat: 'lights', pill: 'DAY 4', title: 'LIGHTS ON', look: 'night', orbit: { c: P(0, 0, 250), r: [330, 300], a: [0.35, 0.6], h: [150, 130], y: 0 }, span: 380 },
  { beat: 'montage', pill: 'WHERE\'S MY HOUSE?', title: (t) => { const s = [...montageSubs].reverse().find((m) => t >= m.t); return s ? s.name.toUpperCase() : 'FOUND THEM'; },
    look: 'night', subs: montageSubs, span: 50, ...frontCam(0, 380) },
  { beat: 'website', pill: 'AT 1,000 CITIZENS', title: 'THE CITY OPENS', look: 'night', progress: true,
    cam: [P(120, 110, 520), P(100, 95, 490)], at: [P(0, 0, 280), P(0, 0, 270)], span: 300 },
  { beat: 'emijinx', pill: 'EMIJINX ASKED', title: 'CHRISTMAS VIBES', look: 'night', card: ['Emijinx'], ...frontCam(emi.x + 1.5, emi.z, 3.4, 16, -3), span: 40 },
  { beat: 'vote', pill: 'THE VOTE', title: 'RESULTS', look: 'night', vote: true, topdown: true,
    cam: [P(-56, 300, -12), P(-59, 262, -20)], at: [P(-56, 0, -14), P(-59, 0, -22)], span: 200 },
  { beat: 'ellis', pill: 'MANAGER', title: 'ELLIS', look: 'night', card: ['Ellis'], cam: [P(-60, 18, -20), P(-66, 14, -32)], at: [P(-77, 4, -66), P(-78, 4, -64)], span: 60 },
  { beat: 'queen', pill: (t) => (t < T.queenUp - 0.1 ? 'TOP COMMENT · 17 ♥' : 'YOUR MAJESTY'), title: (t) => (t < T.queenUp - 0.1 ? 'QUEEN R?' : 'QUEEN R'), look: 'night', card: ['R♡'],
    cam: [P(75 + 48, 34, 175 + 100), P(75 + 32, 26, 175 + 78)], at: [P(75, 10, 175), P(75, 11, 175)], span: 80 },
  { beat: 'asking', pill: 'DAY 2 OF ASKING', title: (t) => (t < T.cheese - 0.6 ? 'NEVER GIVE UP' : t < T.kebab - 1.6 ? 'A BLOCK OF CHEESE' : 'BOSS OF KEBABS'), look: 'night',
    subs: [{ t: 0, ...frontCam(25, 125, 3.5, 30, 0) }, { t: W('asking', /^Arran/, 1.5) - 0.1, ...frontCam(objXZ('Arran').x - 1.5, objXZ('Arran').z + 2, 3, 15, -2), card: 'Arran' },
           { t: W('asking', /^Chris/, 4.5) - 0.1, ...frontCam(objXZ('KEBAB').x, objXZ('KEBAB').z + 4, 4, 17, 2), card: 'chris_r125yzf' }], span: 50 },
  { beat: 'quick', pill: 'YOU ASKED', title: (t) => (t < W('quick', /^Skyla/, 3) - 0.1 ? 'THE SMALLEST HOUSE' : t < T.tree - 0.1 ? 'SINCE 20 FOLLOWERS' : t < T.rainbow - 0.1 ? 'CRYSTAL TREE' : 'RAINBOW NEON'), look: 'night',
    subs: [{ t: 0, cam: [P(-75 + 3, 3, 175 + 9), P(-75 + 0.8, 0.9, 175 + 3)], at: [P(-75, 0.4, 175), P(-75, 0.35, 175)], card: 'Alex' },
           { t: W('quick', /^Skyla/, 3) - 0.1, cam: [P(objXZ('~Skyla~').x - 6, 7, objXZ('~Skyla~').z + 24), P(objXZ('~Skyla~').x - 4, 6, objXZ('~Skyla~').z + 19)], at: [P(objXZ('~Skyla~').x, 4, objXZ('~Skyla~').z), P(objXZ('~Skyla~').x, 4, objXZ('~Skyla~').z)], card: '~Skyla~' },
           { t: T.tree - 0.1, ...frontCam(objXZ('chlo').x, objXZ('chlo').z, 6, 17, 2), card: 'chlo' },
           { t: T.rainbow - 0.1, ...frontCam(objXZ('Penny').x, objXZ('Penny').z + 3, 4, 14, -2), card: 'Penny' }], span: 50 },
  { beat: 'next', pill: 'NEXT VOTE', title: 'A, B OR C?', look: 'night', next: true, topdown: true,
    cam: [P(-6, 300, -62), P(-9, 262, -70)], at: [P(-6, 0, -64), P(-9, 0, -72)], span: 200 },
  { beat: 'end', pill: 'PAUSE &', title: 'FIND YOUR NAME', look: 'night', wall: true, orbit: { c: P(0, 0, 250), r: [300, 270], a: [0.75, 1.0], h: [150, 130], y: 0 }, span: 380 },
];
SHOTS.forEach((s, i) => { s.t0 = i === 0 ? 0 : BEAT[s.beat].start - 0.12; s.t1 = i + 1 < SHOTS.length ? BEAT[SHOTS[i + 1].beat].start - 0.12 : TL.voice_end + 0.15; });
const END_T0 = SHOTS[SHOTS.length - 1].t1;

// ---------------------------------------------------------------- captions
const CHUNKS = [];
for (const b of TL.beats) {
  let chunk = [];
  b.words.forEach(([w, st], i) => {
    chunk.push([w, st]);
    const letters = chunk.map(([x]) => x).join(' ').length, nx = b.words[i + 1];
    if (/[,.:?!]$/.test(w) || chunk.length >= 3 || (nx && letters + 1 + nx[0].length > 18)) { chunk.end = b.end; CHUNKS.push(chunk); chunk = []; }
  });
  if (chunk.length) { chunk.end = b.end; CHUNKS.push(chunk); }
}

// ---------------------------------------------------------------- DOM
const $ = (id) => document.getElementById(id);
const ui = { pill: $('pill'), title: $('title'), caption: $('caption'), big: $('bigNum'), bigN: $('bigN'), cards: [$('card0'), $('card1')],
  progress: $('progress'), pfill: $('pfill'), pcount: $('pcount'), wall: $('wall'), grid: $('wallGrid'), end: $('end') };
if (params.has('clean')) $('ui').style.display = 'none';
$('endK').textContent = `EPISODE ${EP} · DAY ${CFG.day}`;
$('endPop').textContent = `Population: ${N.toLocaleString('en-US')}`;
$('wallHd').textContent = `${STATE.citizens.length} CITIZENS · NEW ONES IN ORANGE`;
ui.grid.innerHTML = STATE.citizens.map((c) => `<div class="nm${c.since_episode === EP ? ' new' : ''}">${c.name}</div>`).join('');
$('progress').querySelector('.label').textContent = `🗺️ AT ${CFG.milestone.target.toLocaleString('en-US')}: ${CFG.milestone.label}`;
const AV = ['#3a6ee8', '#e8578a', '#2fb07a', '#e89a2f', '#8a5ae8', '#2fa8c8'];
const CARDTXT = { chris_r125yzf: 'Day 2 of asking to be boss man at my kebab shop', Emijinx: 'Where is my house with Christmas vibes?? 🙏', Ellis: 'can i be the maneger of the water park please 🙏🙏🙏' };
function cardHtml(name) {
  const c = byName[name] || {}; const text = CARDTXT[name] || c.comment || ''; const likes = c.likes || '';
  const initial = [...name].find((ch) => /[A-Za-z0-9]/.test(ch)) || '★';
  const col = AV[[...name].reduce((a, ch) => a + ch.codePointAt(0), 0) % AV.length];
  return `<span class="tag">THEY COMMENTED</span><div class="row"><div class="av" style="background:${col}">${initial.toUpperCase()}</div>
    <div class="txt"><div class="user">${name}</div><div class="body">${text}</div></div><div class="likes"><span class="heart">&#9829;</span>${likes}</div></div>`;
}
const RESULTS = [
  { i: 1, label: 'CASTLE', pct: CFG.poll.Castle, t: () => T.castle },
  { i: 2, label: 'TOWN CENTRE', pct: CFG.poll['Town centre'], t: () => T.town },
  { i: 0, label: 'WATER PARK', pct: CFG.poll['Water park'], t: () => T.win, win: true },
];
$('results').innerHTML = RESULTS.map((r, k) => `<div class="rpill${r.win ? ' win' : ''}" id="rp${k}">${r.pct}%<small>${r.label}</small></div>`).join('') + '<div class="crown" id="crown">👑</div>';
$('tags').innerHTML = CFG.next_vote.map((l, i) => `<div class="vtag" id="vt${i}">${'ABC'[i]} · ${l}</div>`).join('');

let lastTitle = '', lastCaption = '', lastCards = '';
function setTitle(text) {
  if (text === lastTitle) return;
  lastTitle = text; ui.title.innerHTML = `<span>${text}</span>`; ui.title.style.fontSize = '76px';
  let fs = 76; const sp = ui.title.firstChild; while (sp.offsetWidth > 860 && fs > 40) { fs -= 2; ui.title.style.fontSize = fs + 'px'; }
}
const popScale = (t, t0, d = 0.45) => (t < t0 ? 0 : easeOutBack((t - t0) / d));

// ---------------------------------------------------------------- frame
export function setTime(t) {
  const endcard = t >= END_T0;
  ui.end.style.display = endcard ? 'flex' : 'none';
  if (endcard) {
    for (const el of [ui.pill, ui.title, ui.caption, ui.big, ui.progress, ui.wall]) el.style.display = 'none';
    ui.cards.forEach((c) => (c.style.display = 'none'));
    const lp = easeOutBack((t - (END_T0 + 1.04)) / 0.4);
    $('endLogo').style.transform = `scale(${Math.max(0, 0.3 + 0.7 * lp)})`; $('endLogo').style.opacity = clamp((t - (END_T0 + 0.95)) / 0.1);
    ui.end.style.opacity = clamp((t - END_T0) / 0.3);
    return;
  }
  ui.pill.style.display = ui.title.style.display = ui.caption.style.display = 'block';
  const shot = SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const sub = shot.subs ? [...shot.subs].reverse().find((s) => t >= shot.t0 + 0 && t >= s.t) || shot.subs[0] : null;
  const segT0 = sub && sub.t > shot.t0 ? sub.t : shot.t0;
  const segT1 = sub ? (shot.subs[shot.subs.indexOf(sub) + 1]?.t ?? shot.t1) : shot.t1;
  const k = clamp((t - segT0) / Math.max(0.3, segT1 - segT0)), since = t - shot.t0, sinceSeg = t - segT0;

  // ---- world state
  const count = t < T.today ? PREV : Math.round(PREV + (N - PREV) * easeOut((t - T.today) / 1.2));
  setSign(count);
  setCityLights(lightsK(t));
  fieldEntries.forEach((e, i) => field.setScale(i, 1)); field.commit();
  for (const [name, f] of Object.entries(POPS)) { const o = objs[name]; if (!o) continue; const tt = f(); const s = tt <= 0 ? 1 : popScale(t, tt, 0.5); o.visible = s > 0.001; o.scale.setScalar(Math.max(s, 0.001) * o.userData.baseScale); }
  const xs = popScale(t, T.xmas, 0.4); xmas.visible = xs > 0.001; xmas.scale.setScalar(Math.max(xs, 0.001));
  const rise = clamp((t - T.rise) / 1.4);
  park.visible = rise > 0.001; park.userData.body.scale.set(1, Math.max(easeInOut(rise), 0.001), 1);
  park.userData.sign.visible = rise > 0.95; park.userData.manager.visible = t >= T.ellisTag;
  park.userData.manager.scale.setScalar(Math.max(popScale(t, T.ellisTag, 0.35), 0.001));
  pigeon.userData.animate(t);
  kevinTag.position.y = 12.3 + Math.sin(t * 2.2) * 0.08;
  voteMarks.forEach((m, i) => { m.visible = !!shot.vote && !(i === 0 && rise > 0.05); });
  nextMarks.forEach((m) => { m.visible = !!shot.next; });

  // ---- camera
  const cs = sub || shot; let focus;
  if (shot.orbit) {
    const o = shot.orbit, e = smooth(k), ang = lerp(o.a[0], o.a[1], e), r = lerp(o.r[0], o.r[1], e), h = lerp(o.h[0], o.h[1], e);
    camera.position.set(o.c.x + Math.sin(ang) * r, h, o.c.z + Math.cos(ang) * r); camera.up.set(0, 1, 0); camera.lookAt(o.c.x, o.y, o.c.z); focus = o.c.clone();
  } else {
    const e = smooth(k) * 0.6 + k * 0.4;
    camera.position.lerpVectors(cs.cam[0], cs.cam[1], e);
    const tgt = new THREE.Vector3().lerpVectors(cs.at[0], cs.at[1], e);
    if (shot.topdown) camera.up.set(Math.sin(0.12), 0, -Math.cos(0.12)); else camera.up.set(0, 1, 0);
    camera.lookAt(tgt); focus = tgt.clone().setY(0);
  }
  camera.fov = 52 - 3 * (1 - easeOut(sinceSeg / 0.3)) * (shot.t0 === 0 && segT0 === 0 ? 0 : 1);
  camera.updateProjectionMatrix();
  applyLook(LOOKS[shot.look], focus, shot.span);
  renderer.render(scene, camera);

  // ---- overlays
  ui.pill.textContent = typeof shot.pill === 'function' ? shot.pill(t) : shot.pill;
  setTitle(typeof shot.title === 'function' ? shot.title(t) : shot.title);
  const pop = shot.t0 === 0 ? 1 : easeOutBack(since / 0.3);
  ui.title.style.transform = `scale(${0.85 + 0.15 * pop})`; ui.pill.style.transform = `translateX(-50%) scale(${0.85 + 0.15 * pop})`;

  const bigOn = !!shot.big && t >= T.today && t < T.lightsOn;
  ui.big.style.display = bigOn ? 'block' : 'none';
  if (bigOn) { ui.bigN.textContent = count.toLocaleString('en-US'); ui.big.style.transform = `scale(${0.6 + 0.4 * easeOutBack((t - T.today) / 0.35)})`; }

  const cardList = sub && sub.card ? [sub.card] : shot.card || [];
  const cardT0 = sub && sub.card ? segT0 : shot.t0;
  const key = cardList.join('|') + cardT0;
  if (key !== lastCards) { lastCards = key; cardList.forEach((n, i) => (ui.cards[i].innerHTML = cardHtml(n))); }
  ui.cards.forEach((el, i) => {
    const on = !!cardList[i] && t >= cardT0 + 0.25;
    el.style.display = on ? 'block' : 'none'; el.style.top = [560, 760][i] + 'px';
    if (on) { const p = easeOutBack((t - cardT0 - 0.25) / 0.3); el.style.transform = `translateX(-50%) scale(${0.6 + 0.4 * p})`; el.style.opacity = clamp(p * 1.5); }
  });

  RESULTS.forEach((r, kk) => {
    const el = $('rp' + kk), on = !!shot.vote && t >= r.t();
    el.style.display = on ? 'block' : 'none';
    if (on) { const s = project(VOTE[r.i].clone().add(v3(21, 0, 0))); el.style.left = s.x + 'px'; el.style.top = s.y + 'px'; el.style.transform = `translate(0,-50%) scale(${0.5 + 0.5 * easeOutBack((t - r.t()) / 0.3)})`; }
  });
  const crownOn = !!shot.vote && t >= T.win + 0.2;
  $('crown').style.display = crownOn ? 'block' : 'none';
  if (crownOn) { const s = project(VOTE[0].clone().add(v3(30, 0, -7))); $('crown').style.left = s.x + 'px'; $('crown').style.top = s.y + 'px'; $('crown').style.transform = `translate(-50%,-100%) scale(${easeOutBack((t - T.win - 0.2) / 0.35)}) rotate(-12deg)`; }
  [T.tagA, T.tagB, T.tagC].forEach((tt, i) => {
    const el = $('vt' + i), on = !!shot.next && t >= tt;
    el.style.display = on ? 'block' : 'none';
    if (on) { const s = project(NEXT[i].clone().add(v3(21, 0, 0))); el.style.left = s.x + 'px'; el.style.top = s.y + 'px'; el.style.transform = `translate(0,-50%) scale(${0.5 + 0.5 * easeOutBack((t - tt) / 0.3)})`; }
  });
  ui.progress.style.display = shot.progress ? 'block' : 'none';
  if (shot.progress) {
    const f = easeOut((t - shot.t0 - 0.4) / 1.5) * Math.min(1, N / CFG.milestone.target);
    ui.pfill.style.width = (f * 100).toFixed(2) + '%'; ui.pcount.textContent = `${Math.round(f * CFG.milestone.target).toLocaleString('en-US')} / ${CFG.milestone.target.toLocaleString('en-US')}`;
  }
  ui.wall.style.display = shot.wall ? 'block' : 'none';
  if (shot.wall) {
    const p = easeOutBack(since / 0.4); ui.wall.style.transform = `scale(${0.8 + 0.2 * p})`; ui.wall.style.opacity = clamp(p * 1.4);
    const maxScroll = Math.max(0, ui.grid.scrollHeight - 560);
    ui.grid.style.transform = `translateY(${-maxScroll * smooth((since - 0.6) / Math.max(1, shot.t1 - shot.t0 - 1.0))}px)`;
  }
  let html = '', ci = -1;
  for (let i = 0; i < CHUNKS.length; i++) if (CHUNKS[i][0][1] <= t) ci = i;
  if (ci >= 0 && t < CHUNKS[ci].end + 0.25) {
    const words = CHUNKS[ci]; let wi = 0; for (let i = 0; i < words.length; i++) if (words[i][1] <= t) wi = i;
    html = words.map(([w], i) => (i === wi ? `<span class="hl">${w}</span>` : w)).join(' ');
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
