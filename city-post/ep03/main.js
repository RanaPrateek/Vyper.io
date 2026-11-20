// Episode 3: "A whole new neighbourhood." Sorry Rosie, ~180 new houses, six special houses,
// Billionaires' Hill, the cinema, the pigeon gets a name, the 100-citizen milestone.
import {
  THREE, params, clamp, lerp, smooth, easeOut, easeInOut, easeOutBack, v3, renderer, scene, camera,
  LOOKS, applyLook, HALF, SIGN_CENTER, sign, setSign, makeHouse, makeCarHouse, makeMansion, makeMall,
  makePigeon, plotMarker, project, makeHouseField, makeVilla, makeDistrict, makeCinema, makeNeonExtension,
  makePotatoHouse, makeDuckHouse, makeShoeHouse, makeOstrichHouse, makeNuggetHouse, makePigeonStatue, nameplate,
} from '../world.js';

const load = (f) => fetch(f).then((r) => r.json());
const [TL, CFG, STATE] = await Promise.all([load('./timeline.json'), load('./config.json'), load('../city/state.json')]);
export const DURATION = TL.duration;
const N = CFG.followers, PREV = CFG.previous_followers;
const BEAT = Object.fromEntries(TL.beats.map((b) => [b.id, b]));
const W = (id, re, off = 0) => { const w = BEAT[id].words.find(([x]) => re.test(x)); return w ? w[1] : BEAT[id].start + off; };

// ---------------------------------------------------------------- the city
const byName = Object.fromEntries(STATE.citizens.map((c) => [c.name, c]));
const old = [], specials = {}, villas = [], fieldEntries = [];
for (const c of STATE.citizens) {
  if (c.since_episode <= 2) {
    const o = c.house === 'car' ? makeCarHouse(c.name) : c.house === 'mansion' ? makeMansion(c.name) : makeHouse(c.name, { roof: c.roof ?? 0xd2653b, neon: c.house === 'neon' });
    o.position.set(c.x, 0, c.z); scene.add(o); old.push(o);
  } else if (c.house === 'house') {
    fieldEntries.push({ name: c.name, x: c.x, z: c.z, roof: c.roof, wall: c.wall });
  } else if (c.house === 'villa') {
    const o = makeVilla(c.name); o.position.set(c.x, c.y || 0, c.z); scene.add(o); villas.push(o);
  } else {
    const mk = { potato: makePotatoHouse, duck: makeDuckHouse, shoe: makeShoeHouse, ostrich: makeOstrichHouse, nugget: makeNuggetHouse, statue: makePigeonStatue }[c.house];
    const o = mk(c.name); o.position.set(c.x, 0, c.z); scene.add(o); specials[c.house] = o;
  }
}
const field = makeHouseField(fieldEntries); scene.add(field.group);
const tam = byName.Tamara;
const ext = makeNeonExtension(tam.extension.colour); ext.position.set(tam.x + 7.2, 0, tam.z + 0.5); scene.add(ext);
const mall = makeMall('GIANT MALL'); mall.position.set(-25, 0, 25); scene.add(mall);
const cinema = makeCinema('CINEMA'); cinema.position.set(25, 0, 25); scene.add(cinema);
const hillB = STATE.buildings.find((b) => b.id === 'billionaires_hill');
const hill = makeDistrict(hillB.x, hillB.z, hillB.w, hillB.d, hillB.h, "BILLIONAIRES' HILL"); scene.add(hill);

const pigeon = makePigeon(); pigeon.position.set(2.2, 10.0, 0.05); pigeon.rotation.y = 0.35; sign.add(pigeon);
const kevinTag = nameplate(CFG.pigeon_name.toUpperCase(), 2.2, 0.55, { bg: '#ff6a13', fg: '#ffffff' }); kevinTag.position.set(2.2, 9.6, 0.2); sign.add(kevinTag);
sign.updateMatrixWorld(true);
const signFront = v3(Math.sin(-0.38), 0, Math.cos(-0.38)), signRight = v3(Math.cos(-0.38), 0, -Math.sin(-0.38));
const PIGEON_WORLD = sign.localToWorld(v3(2.2, 11.0, 0.05));

// bouncing arrow over Rosie's house
const arrow = new THREE.Group();
{ const m = new THREE.MeshStandardMaterial({ color: 0xff6a13, emissive: 0xff6a13, emissiveIntensity: 0.4 });
  const head = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.6, 16), m); head.rotation.x = Math.PI; head.position.y = 1.3; arrow.add(head);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 3, 12), m); shaft.position.y = 4; arrow.add(shaft); }
const rosie = byName.r0sie670; arrow.position.set(rosie.x, 10, rosie.z); scene.add(arrow);

const VOTE = [v3(25, 0.06, -75), v3(25, 0.06, -25), v3(25, 0.06, 25)];     // A skate park, B fire station, C cinema
const NEXT = [v3(-75, 0.06, -75), v3(-75, 0.06, -25), v3(-75, 0.06, 25)];
const voteMarks = VOTE.map((p, i) => { const m = plotMarker('ABC'[i]); m.position.copy(p).add(v3(0, 0.05, 0)); scene.add(m); return m; });
const nextMarks = NEXT.map((p, i) => { const m = plotMarker('ABC'[i]); m.position.copy(p).add(v3(0, 0.05, 0)); scene.add(m); return m; });

// ---------------------------------------------------------------- cue times
const T = {
  today: W('hook', /^Today/, 2.8),
  ext: W('tamara', /^Done/, 3.5),
  housesPop: BEAT.houses.start + 0.8,
  hillUp: BEAT.hill.start + 0.3, tie: W('hill', /^A$/, 7),
  fire: W('vote', /^Fire/, 1), skate: W('vote', /^Skate/, 2.5),
  kevin: W('pigeon', /^Kevin/, 1.5),
  tagA: W('next', /^A,/, 1), tagB: W('next', /^B,/, 2), tagC: W('next', /^C,/, 3),
};
{ const pct = BEAT.vote.words.filter(([x]) => /%/.test(x)); T.win = pct.length ? pct[pct.length - 1][1] : BEAT.vote.end - 0.6; }
T.rise = T.win + 0.35;
// houses pop in a wave spreading out from the entrance
const ENTR = v3(0, 0, 400);
const fieldDist = fieldEntries.map((e) => Math.hypot(e.x - ENTR.x, e.z - ENTR.z));
const specialList = Object.values(specials);
const specDist = specialList.map((o) => o.position.distanceTo(ENTR));
const dMax = Math.max(...fieldDist, ...specDist);
const popTime = (d) => T.housesPop + (d / dMax) * 3.0;
const villaPop = villas.map((v, i) => T.hillUp + 0.9 + (i / villas.length) * 2.6);

// ---------------------------------------------------------------- shots
const P = (x, y, z) => v3(x, y, z);
const near = (o, a, b, ay = 3) => ({ cam: [o.position.clone().add(v3(...a)), o.position.clone().add(v3(...b))], at: [o.position.clone().add(v3(0, ay, 0)), o.position.clone().add(v3(0, ay, 0))] });
const rosieO = { position: v3(rosie.x, 0, rosie.z) }, tamO = { position: v3(tam.x + 3.6, 0, tam.z) };
const CARD = {
  r0sie670: ['r0sie670', 'Where is my house :(', 1], Tamara: ['Tamara', 'I love it ! Might have to make an extension in neon purple 🥰', ''],
  Jessica: ['Jessica💗', 'C, the pigeon called kevin', ''],
};
const card = (name) => CARD[name] || [name, byName[name].comment, byName[name].likes || ''];
const SHOTS = [
  { beat: 'hook', pill: `DAY ${CFG.day}`, title: (t) => (t < T.today - 0.1 ? 'YESTERDAY' : 'TODAY'), look: 'day',
    cam: [P(5.0, 7.5, HALF + 92), P(6.5, 7.6, HALF + 87)], at: [SIGN_CENTER.clone().add(v3(-1, 5.5, 0)), SIGN_CENTER.clone().add(v3(0.4, 5.5, 0))], span: 60 },
  { beat: 'rosie', pill: 'SORRY ROSIE', title: 'FOUND IT', look: 'day', card: ['r0sie670'], arrow: true, cam: [P(23, 5.6, 358), P(25.5, 5, 347)], at: [P(rosie.x - 1, 4.4, rosie.z), P(rosie.x - 0.5, 4.2, rosie.z)], span: 50 },
  { beat: 'tamara', pill: 'TAMARA ASKED', title: 'NEON PURPLE', look: 'dusk', card: ['Tamara'], ...near(tamO, [6, 6, 24], [3, 5, 17], 3), span: 50 },
  { beat: 'houses', pill: 'NEW NEIGHBOURHOOD', title: `+${fieldEntries.length + specialList.length} HOUSES`, look: 'day',
    cam: [P(0, 55, 470), P(0, 190, 590)], at: [P(0, 0, 330), P(0, 0, 250)], span: 330 },
  { beat: 'potato', pill: 'MILEY ASKED', title: 'A POTATO', look: 'day', card: ['Miley'], ...near(specials.potato, [5, 4.5, 20], [3, 4, 15], 3.5), span: 40 },
  { beat: 'duck', pill: 'KAI ASKED', title: 'RUBBER DUCK', look: 'day', card: ['Kai'], ...near(specials.duck, [6, 6, 22], [4, 5.5, 17], 5), span: 40 },
  { beat: 'shoe', pill: 'LILYY ASKED', title: 'SIZE 400', look: 'day', card: ['Lilyy'], ...near(specials.shoe, [16, 9, 30], [12, 8, 23], 3.5), span: 40 },
  { beat: 'ostrich', pill: 'OLIVIA ASKED', title: 'AN OSTRICH', look: 'day', card: ['Olivia🥲'], ...near(specials.ostrich, [6, 9, 28], [4, 9, 22], 9), span: 40 },
  { beat: 'nugget', pill: 'EVAA ASKED', title: 'A NUGGET', look: 'day', card: ['Evaa🤍'], ...near(specials.nugget, [6, 4.5, 20], [4, 4, 15], 3.5), span: 40 },
  { beat: 'kacee', pill: 'KACEE ASKED', title: 'PIGEON STATUE', look: 'golden', card: ['Kacee'], ...near(specials.statue, [8, 8, 30], [5, 8, 23], 8), span: 50 },
  { beat: 'hill', pill: (t) => (t < T.tie - 0.1 ? '30 MANSIONS' : 'ALL THE SAME SIZE'), title: (t) => (t < T.tie - 0.1 ? "BILLIONAIRES' HILL" : 'A 30-WAY TIE'), look: 'golden',
    cam: [P(225 + 130, 95, 275 + 250), P(225 + 70, 70, 275 + 200)], at: [P(225, 0, 275), P(225, 3, 270)], span: 230 },
  { beat: 'vote', pill: 'THE VOTE', title: 'RESULTS', look: 'day', vote: true, topdown: true,
    cam: [P(44, 300, -12), P(41, 262, -20)], at: [P(44, 0, -14), P(41, 0, -22)], span: 200 },
  { beat: 'pigeon', pill: 'HIS NAME IS', title: (t) => (t < T.kevin - 0.05 ? '...' : CFG.pigeon_name.toUpperCase()), look: 'day', card: ['Jessica'],
    cam: [PIGEON_WORLD.clone().addScaledVector(signFront, 9).add(signRight.clone().multiplyScalar(2.5)).add(v3(0, 0.2, 0)),
          PIGEON_WORLD.clone().addScaledVector(signFront, 6.5).add(signRight.clone().multiplyScalar(1.6)).add(v3(0, 0.1, 0))],
    at: [PIGEON_WORLD.clone().add(v3(0, -1.0, 0)), PIGEON_WORLD.clone().add(v3(0, -0.8, 0))], span: 30 },
  { beat: 'milestone', pill: CFG.milestone_state === 'reached' ? 'WE DID IT' : 'NEXT MILESTONE', title: 'ELECTRICITY', look: 'dusk', progress: CFG.milestone_state !== 'reached', reached: CFG.milestone_state === 'reached',
    cam: [P(130, 95, 500), P(105, 80, 470)], at: [P(0, 0, 290), P(0, 0, 280)], span: 260 },
  { beat: 'next', pill: 'NEXT VOTE', title: 'A, B OR C?', look: 'day', next: true, topdown: true,
    cam: [P(-56, 300, -12), P(-59, 262, -20)], at: [P(-56, 0, -14), P(-59, 0, -22)], span: 200 },
  { beat: 'end', pill: 'PAUSE &', title: 'FIND YOUR NAME', look: 'golden', wall: true, orbit: { c: P(0, 0, 300), r: [260, 230], a: [0.7, 1.0], h: [140, 120], y: 0 }, span: 330 },
];
SHOTS.forEach((s, i) => {
  s.t0 = i === 0 ? 0 : BEAT[s.beat].start - 0.12;
  s.t1 = i + 1 < SHOTS.length ? BEAT[SHOTS[i + 1].beat].start - 0.12 : TL.voice_end + 0.15;
});
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
  progress: $('progress'), pfill: $('pfill'), pcount: $('pcount'), wall: $('wall'), grid: $('wallGrid'), reached: $('reached'), end: $('end') };
if (params.has('clean')) $('ui').style.display = 'none';
$('endK').textContent = `EPISODE ${CFG.episode} · DAY ${CFG.day}`;
$('endPop').textContent = `Population: ${N.toLocaleString('en-US')}`;
$('wallHd').textContent = `${STATE.citizens.length} CITIZENS · NEW ONES IN ORANGE`;
ui.grid.innerHTML = STATE.citizens.map((c) => `<div class="nm${c.since_episode === CFG.episode ? ' new' : ''}">${c.name}</div>`).join('');
$('progress').querySelector('.label').textContent = `⚡ AT ${CFG.milestone.target}: ${CFG.milestone.label}`;
const AV = ['#3a6ee8', '#e8578a', '#2fb07a', '#e89a2f', '#8a5ae8', '#2fa8c8'];
function cardHtml(key) {
  const [name, text, likes] = card(key);
  const initial = [...name].find((ch) => /[A-Za-z0-9]/.test(ch)) || '★';
  const col = AV[[...name].reduce((a, ch) => a + ch.codePointAt(0), 0) % AV.length];
  return `<span class="tag">THEY COMMENTED</span><div class="row"><div class="av" style="background:${col}">${initial.toUpperCase()}</div>
    <div class="txt"><div class="user">${name}</div><div class="body">${text}</div></div><div class="likes"><span class="heart">&#9829;</span>${likes}</div></div>`;
}
const RESULTS = [
  { i: 1, label: 'FIRE STATION', pct: CFG.poll['Fire station'], t: () => T.fire },
  { i: 0, label: 'SKATE PARK', pct: CFG.poll['Skate park'], t: () => T.skate },
  { i: 2, label: 'CINEMA', pct: CFG.poll.Cinema, t: () => T.win, win: true },
];
$('results').innerHTML = RESULTS.map((r, k) => `<div class="rpill${r.win ? ' win' : ''}" id="rp${k}">${r.pct}%<small>${r.label}</small></div>`).join('') + '<div class="crown" id="crown">👑</div>';
$('tags').innerHTML = CFG.next_vote.map((l, i) => `<div class="vtag" id="vt${i}">${'ABC'[i]} · ${l}</div>`).join('');

let lastTitle = '', lastCaption = '', lastCards = '';
function setTitle(text) {
  if (text === lastTitle) return;
  lastTitle = text; ui.title.innerHTML = `<span>${text}</span>`; ui.title.style.fontSize = '76px';
  let fs = 76; const sp = ui.title.firstChild;
  while (sp.offsetWidth > 860 && fs > 40) { fs -= 2; ui.title.style.fontSize = fs + 'px'; }
}
const popScale = (t, t0, d = 0.45) => (t < t0 ? 0 : easeOutBack((t - t0) / d));

// ---------------------------------------------------------------- frame
export function setTime(t) {
  const endcard = t >= END_T0;
  ui.end.style.display = endcard ? 'flex' : 'none';
  if (endcard) {
    for (const el of [ui.pill, ui.title, ui.caption, ui.big, ui.progress, ui.wall, ui.reached]) el.style.display = 'none';
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
  fieldEntries.forEach((e, i) => field.setScale(i, popScale(t, popTime(fieldDist[i]))));
  field.commit();
  specialList.forEach((o, i) => { const s = popScale(t, popTime(specDist[i])); o.visible = s > 0.001; o.scale.setScalar(Math.max(s, 0.001)); });
  const es = popScale(t, T.ext, 0.5); ext.visible = es > 0.001; ext.scale.setScalar(Math.max(es, 0.001));
  const hs = clamp((t - T.hillUp) / 0.8); hill.visible = hs > 0.001; hill.scale.set(1, Math.max(easeOut(hs), 0.001), 1);
  villas.forEach((v, i) => { const s = popScale(t, villaPop[i], 0.4); v.visible = s > 0.001; v.scale.setScalar(Math.max(s, 0.001)); });
  const rise = clamp((t - T.rise) / 1.6);
  cinema.visible = rise > 0.001; cinema.userData.body.scale.set(1, Math.max(easeInOut(rise), 0.001), 1);
  cinema.userData.sign.visible = rise > 0.95; cinema.userData.sign.scale.setScalar(Math.max(easeOutBack((t - T.rise - 1.6) / 0.4), 0.001));
  pigeon.userData.animate(t);
  if (specials.statue) specials.statue.userData.pigeon.userData.animate(t * 0.6 + 1);
  kevinTag.visible = t >= T.kevin; kevinTag.scale.setScalar(Math.max(popScale(t, T.kevin, 0.35), 0.001));
  arrow.visible = !!shot.arrow; arrow.position.y = 8.6 + Math.abs(Math.sin(t * 4)) * 1.0; arrow.rotation.y = t;
  voteMarks.forEach((m, i) => { m.visible = !!shot.vote && !(i === 2 && rise > 0.05); });
  nextMarks.forEach((m) => { m.visible = !!shot.next; });

  // ---- camera
  let focus;
  if (shot.orbit) {
    const o = shot.orbit, e = smooth(k), ang = lerp(o.a[0], o.a[1], e), r = lerp(o.r[0], o.r[1], e), h = lerp(o.h[0], o.h[1], e);
    camera.position.set(o.c.x + Math.sin(ang) * r, h, o.c.z + Math.cos(ang) * r); camera.up.set(0, 1, 0); camera.lookAt(o.c.x, o.y, o.c.z); focus = o.c.clone();
  } else {
    const e = smooth(k) * 0.6 + k * 0.4;
    camera.position.lerpVectors(shot.cam[0], shot.cam[1], e);
    const tgt = new THREE.Vector3().lerpVectors(shot.at[0], shot.at[1], e);
    if (shot.topdown) camera.up.set(Math.sin(0.12), 0, -Math.cos(0.12)); else camera.up.set(0, 1, 0);
    camera.lookAt(tgt); focus = tgt.clone().setY(0);
  }
  camera.fov = 52 - 3 * (1 - easeOut(since / 0.35)) * (shot.t0 === 0 ? 0 : 1);
  camera.updateProjectionMatrix();
  applyLook(LOOKS[shot.look], focus, shot.span);
  renderer.render(scene, camera);

  // ---- overlays
  ui.pill.textContent = typeof shot.pill === 'function' ? shot.pill(t) : shot.pill;
  setTitle(typeof shot.title === 'function' ? shot.title(t) : shot.title);
  const pop = shot.t0 === 0 ? 1 : easeOutBack(since / 0.3);
  ui.title.style.transform = `scale(${0.85 + 0.15 * pop})`;
  ui.pill.style.transform = `translateX(-50%) scale(${0.85 + 0.15 * pop})`;

  const bigOn = shot.beat === 'hook' && t >= T.today;
  ui.big.style.display = bigOn ? 'block' : 'none';
  if (bigOn) { ui.bigN.textContent = count.toLocaleString('en-US'); ui.big.style.transform = `scale(${0.6 + 0.4 * easeOutBack((t - T.today) / 0.35)})`; }

  const cards = shot.card ? shot.card.join('|') : '';
  if (cards !== lastCards) { lastCards = cards; (shot.card || []).forEach((n, i) => (ui.cards[i].innerHTML = cardHtml(n))); }
  ui.cards.forEach((el, i) => {
    const on = !!(shot.card && shot.card[i]) && t >= shot.t0 + 0.3 + i * 0.5;
    el.style.display = on ? 'block' : 'none';
    if (on) { const p = easeOutBack((t - shot.t0 - 0.3 - i * 0.5) / 0.3); el.style.transform = `translateX(-50%) scale(${0.6 + 0.4 * p})`; el.style.opacity = clamp(p * 1.5); }
  });

  RESULTS.forEach((r, kk) => {
    const el = $('rp' + kk), on = !!shot.vote && t >= r.t();
    el.style.display = on ? 'block' : 'none';
    if (on) { const s = project(VOTE[r.i].clone().add(v3(21, 0, 0))); el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
      el.style.transform = `translate(0,-50%) scale(${0.5 + 0.5 * easeOutBack((t - r.t()) / 0.3)})`; }
  });
  const crownOn = !!shot.vote && t >= T.win + 0.2;
  $('crown').style.display = crownOn ? 'block' : 'none';
  if (crownOn) { const s = project(VOTE[2].clone().add(v3(30, 0, -7))); $('crown').style.left = s.x + 'px'; $('crown').style.top = s.y + 'px';
    $('crown').style.transform = `translate(-50%,-100%) scale(${easeOutBack((t - T.win - 0.2) / 0.35)}) rotate(-12deg)`; }
  [T.tagA, T.tagB, T.tagC].forEach((tt, i) => {
    const el = $('vt' + i), on = !!shot.next && t >= tt;
    el.style.display = on ? 'block' : 'none';
    if (on) { const s = project(NEXT[i].clone().add(v3(21, 0, 0))); el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
      el.style.transform = `translate(0,-50%) scale(${0.5 + 0.5 * easeOutBack((t - tt) / 0.3)})`; }
  });

  ui.progress.style.display = shot.progress ? 'block' : 'none';
  if (shot.progress) {
    const f = easeOut((t - shot.t0 - 0.5) / 1.5) * Math.min(1, N / CFG.milestone.target);
    ui.pfill.style.width = (f * 100).toFixed(2) + '%'; ui.pcount.textContent = `${Math.round(f * CFG.milestone.target)} / ${CFG.milestone.target}`;
  }
  ui.reached.style.display = shot.reached ? 'block' : 'none';
  if (shot.reached) ui.reached.style.transform = `scale(${easeOutBack((since - 0.4) / 0.4)})`;

  ui.wall.style.display = shot.wall ? 'block' : 'none';
  if (shot.wall) {
    const p = easeOutBack(since / 0.4); ui.wall.style.transform = `scale(${0.8 + 0.2 * p})`; ui.wall.style.opacity = clamp(p * 1.4);
    const maxScroll = Math.max(0, ui.grid.scrollHeight - 560);
    ui.grid.style.transform = `translateY(${-maxScroll * smooth((since - 0.8) / Math.max(1, shot.t1 - shot.t0 - 1.2))}px)`;
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
