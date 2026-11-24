// Short: "Day 1 vs Day 5". A stand-alone timelapse for brand-new viewers: the empty grid builds itself into
// the whole city in about 4 s, quick cuts of the weirdest houses, then the lights come on. Bright and moving
// from frame 1.
import {
  THREE, params, clamp, lerp, smooth, easeOut, easeInOut, easeOutBack, v3, renderer, scene, camera,
  LOOKS, applyLook, sign, setSign, makeHouse, makeCarHouse, makeMansion, makeMall, makePigeon,
  makeHouseField, makeVilla, makeDistrict, makeCinema, makeNeonExtension, makePotatoHouse, makeDuckHouse,
  makeShoeHouse, makeOstrichHouse, makeNuggetHouse, makePigeonStatue, floatingTag, setCityLights, christmasLights,
  makeWaterPark, makeCastle, makeCheeseHouse, makeKebabShop, makeTacoHouse, makeRainbowNeonHouse, makeCrystalTree, makeCrowd, makeOnlookers, arcSpots,
} from '../world.js';

const load = (f) => fetch(f).then((r) => r.json());
const [TL, STATE] = await Promise.all([load('./timeline.json'), load('../city/state.json')]);
export const DURATION = TL.duration;
const BEAT = Object.fromEntries(TL.beats.map((b) => [b.id, b]));
const W = (id, re, off = 0) => { const w = BEAT[id].words.find(([x]) => re.test(x)); return w ? w[1] : BEAT[id].start + off; };

// ---------------------------------------------------------------- the whole city
const byName = Object.fromEntries(STATE.citizens.map((c) => [c.name, c]));
const MAKERS = { potato: makePotatoHouse, duck: makeDuckHouse, shoe: makeShoeHouse, ostrich: makeOstrichHouse, nugget: makeNuggetHouse,
  statue: makePigeonStatue, cheese: makeCheeseHouse, taco: makeTacoHouse, rainbow: makeRainbowNeonHouse, crystal: makeCrystalTree };
const ENTR = v3(0, 0, 400);
const pops = [];            // { obj | fieldIndex, d (distance from entrance), base }
const fieldEntries = [];
for (const c of STATE.citizens.filter((c) => c.since_episode <= 4)) {
  const d = Math.hypot(c.x - ENTR.x, c.z - ENTR.z);
  if (c.house === 'house' && c.since_episode >= 3 && !c.tiny) { pops.push({ f: fieldEntries.length, d }); fieldEntries.push({ name: c.name, x: c.x, z: c.z, roof: c.roof, wall: c.wall }); continue; }
  let o;
  if (c.house === 'house' || c.house === 'neon') o = makeHouse(c.name, { roof: c.roof ?? 0xd2653b, neon: c.house === 'neon' });
  else if (c.house === 'car') o = makeCarHouse(c.name);
  else if (c.house === 'mansion') o = makeMansion(c.name);
  else if (c.house === 'villa') o = makeVilla(c.name);
  else if (c.house === 'castle') o = makeCastle('R');
  else o = MAKERS[c.house](c.name);
  o.position.set(c.x, c.y || 0, c.z); scene.add(o);
  pops.push({ obj: o, d, base: c.scale || 1, name: c.name });
}
const field = makeHouseField(fieldEntries); scene.add(field.group);
const objOf = (name) => pops.find((p) => p.name === name).obj;
const tam = byName.Tamara; const ext = makeNeonExtension(tam.extension.colour); ext.position.set(tam.x - 7.4, 0, tam.z + 0.5); scene.add(ext);
const emi = byName.Emijinx; const xmas = christmasLights(); xmas.position.set(emi.x, 0, emi.z); scene.add(xmas);
const B = Object.fromEntries(STATE.buildings.map((b) => [b.id, b]));
const risers = [];
const add = (o, x, z, body) => { o.position.set(x, 0, z); scene.add(o); risers.push({ o, body: body || o, d: Math.hypot(x - ENTR.x, z - ENTR.z) }); return o; };
const mall = makeMall('GIANT MALL'); add(mall, -25, 25, mall.userData.body);
const cinema = makeCinema('CINEMA'); add(cinema, 25, 25, cinema.userData.body);
const park = makeWaterPark('Ellis'); add(park, B.waterpark.x, B.waterpark.z, park.userData.body);
const kebab = makeKebabShop(B.kebab.boss); add(kebab, B.kebab.x, B.kebab.z);
const hill = makeDistrict(B.billionaires_hill.x, B.billionaires_hill.z, B.billionaires_hill.w, B.billionaires_hill.d, B.billionaires_hill.h, "BILLIONAIRES' HILL"); scene.add(hill);
const pigeon = makePigeon(); pigeon.position.set(2.2, 10.0, 0.05); pigeon.rotation.y = 0.35; sign.add(pigeon);
const crowd = makeCrowd(1100, { cz: 250, spread: 220 }); scene.add(crowd.group);
const ONLOOK = [];
for (const [nm, r0, r1, sp] of [['Miley', 7, 9, 2.6], ['Kai', 7.5, 9.5, 2.6], ['Lilyy', 6, 7.5, 2.2], ['~Skyla~', 6.5, 8.5, 2.6]]) { const o = objOf(nm).position; ONLOOK.push(...arcSpots(o.x, o.z, { n: 8, r0, r1, spreadAng: sp, seed: ONLOOK.length + 7 }).filter(([x, z]) => Math.abs(x - o.x) > 3.5)); }
{ const c = byName['R♡']; ONLOOK.push(...arcSpots(c.x, c.z, { n: 18, r0: 22, r1: 30, spreadAng: 1.6, seed: 99 })); }
const onlookers = makeOnlookers(ONLOOK); scene.add(onlookers);
const kevinTag = floatingTag('KEVIN', { height: 0.5 }); kevinTag.position.set(2.2, 12.3, 0.05); kevinTag.scale.set(1.6, 0.5, 1); sign.add(kevinTag);

// ---------------------------------------------------------------- timing
const BUILD0 = W('hook', /^empty/, 1.4) + 0.15, BUILD1 = BEAT.rule.end;   // the city builds itself in this window
const dMax = Math.max(...pops.map((p) => p.d), ...risers.map((r) => r.d));
const popAt = (d) => BUILD0 + (d / dMax) * (BUILD1 - BUILD0 - 0.4);
const T = { potato: W('weird', /^potato/), duck: W('weird', /^rubber/), shoe: W('weird', /^giant/), taco: W('weird', /^taco/), castle: W('weird', /^castle/),
  lights: W('lights', /^lights/, 1.5) };
const DAY = (t) => (t < BUILD0 ? 1 : Math.min(5, 1 + Math.floor(4 * clamp((t - BUILD0) / (BUILD1 - BUILD0)) + 0.999)));
const lightsK = (t) => { if (t < T.lights) return 0; const d = t - T.lights; if (d < 0.1) return 0.8; if (d < 0.18) return 0.1; if (d < 0.26) return 1; return clamp(0.5 + d * 2); };

// ---------------------------------------------------------------- shots
const P = (x, y, z) => v3(x, y, z);
const near = (o, a, b, ay) => ({ cam: [o.position.clone().add(v3(...a)), o.position.clone().add(v3(...b))], at: [o.position.clone().add(v3(0, ay, 0)), o.position.clone().add(v3(0, ay, 0))] });
const castleO = { position: v3(byName['R♡'].x, 0, byName['R♡'].z) };
const FLASH = 0.6;   // frame 1: the finished city, then rewind to day 1
const SHOTS = [
  { t0: 0, t1: FLASH, look: 'day', pill: 'DAY 5', title: 'TIKTOK BUILT THIS CITY', flash: true,
    orbit: { c: P(0, 0, 220), r: [330, 320], a: [0.55, 0.6], h: [150, 145], y: 0 }, span: 420 },
  { t0: FLASH, t1: BEAT.weird.start - 0.08, look: 'day', pill: (t) => `DAY ${DAY(t)}`, title: 'TIKTOK BUILT THIS CITY', big: true,
    orbit: { c: P(0, 0, 220), r: [300, 360], a: [0.15, 0.75], h: [70, 230], y: 0 }, span: 420 },
  { t0: BEAT.weird.start - 0.08, t1: T.duck - 0.08, look: 'day', pill: 'COMMENT 1', title: 'A POTATO', ...near(objOf('Miley'), [6, 5, 22], [4, 4.4, 17], 3.5), span: 40 },
  { t0: T.duck - 0.08, t1: T.shoe - 0.08, look: 'day', pill: 'COMMENT 2', title: 'A RUBBER DUCK', ...near(objOf('Kai'), [7, 6.5, 24], [5, 6, 19], 5), span: 40 },
  { t0: T.shoe - 0.08, t1: T.taco - 0.08, look: 'day', pill: 'COMMENT 3', title: 'A GIANT SHOE', ...near(objOf('Lilyy'), [2, 10, 44], [2, 9, 38], 3.5), span: 50 },
  { t0: T.taco - 0.08, t1: T.castle - 0.08, look: 'day', pill: 'COMMENT 4', title: 'A TACO', ...near(objOf('~Skyla~'), [-6, 7, 24], [-4, 6, 19], 4), span: 40 },
  { t0: T.castle - 0.08, t1: BEAT.lights.start - 0.08, look: 'golden', pill: 'TOP COMMENT', title: 'A CASTLE FOR THE QUEEN', ...near(castleO, [48, 34, 100], [34, 27, 80], 10.5), span: 80 },
  { t0: BEAT.lights.start - 0.08, t1: BEAT.cta.start - 0.08, look: (t) => (t < T.lights ? 'dusk' : 'night'), pill: 'DAY 5', title: (t) => (t < T.lights - 0.05 ? '240 HOUSES LATER' : 'LIGHTS ON'),
    orbit: { c: P(0, 0, 250), r: [340, 310], a: [0.3, 0.55], h: [160, 140], y: 0 }, span: 400 },
  { t0: BEAT.cta.start - 0.08, t1: TL.voice_end + 0.3, look: 'night', pill: 'YOUR TURN', title: 'COMMENT = YOUR HOUSE',
    orbit: { c: P(0, 0, 250), r: [310, 295], a: [0.55, 0.68], h: [140, 130], y: 0 }, span: 400 },
];
const END_T0 = SHOTS[SHOTS.length - 1].t1;

// ---------------------------------------------------------------- captions
const CHUNKS = [];
for (const b of TL.beats) {
  let chunk = [];
  b.words.forEach(([w, st], i) => {
    chunk.push([w, st]); const letters = chunk.map(([x]) => x).join(' ').length, nx = b.words[i + 1];
    if (/[,.:?!]$/.test(w) || chunk.length >= 3 || (nx && letters + 1 + nx[0].length > 18)) { chunk.end = b.end; CHUNKS.push(chunk); chunk = []; }
  });
  if (chunk.length) { chunk.end = b.end; CHUNKS.push(chunk); }
}

// ---------------------------------------------------------------- DOM
const $ = (id) => document.getElementById(id);
const ui = { pill: $('pill'), title: $('title'), caption: $('caption'), big: $('bigNum'), bigN: $('bigN'), end: $('end') };
for (const id of ['card0', 'card1', 'progress', 'wall', 'results', 'tags']) { const el = $(id); if (el) el.style.display = 'none'; }
if (params.has('clean')) $('ui').style.display = 'none';
$('endK').textContent = 'COMMENT = YOUR OWN HOUSE';
$('endPop').textContent = `Population: ${STATE.citizens.length}+`;
document.querySelector('#bigNum .l').textContent = 'HOUSES';
let lastTitle = '', lastCaption = '';
function setTitle(text) {
  if (text === lastTitle) return; lastTitle = text; ui.title.innerHTML = `<span>${text}</span>`; ui.title.style.fontSize = '76px';
  let fs = 76; const sp = ui.title.firstChild; while (sp.offsetWidth > 860 && fs > 40) { fs -= 2; ui.title.style.fontSize = fs + 'px'; }
}
const popScale = (t, t0, d = 0.35) => (t < FLASH ? 1 : t < t0 ? 0 : easeOutBack((t - t0) / d));

export function setTime(t) {
  const endcard = t >= END_T0;
  ui.end.style.display = endcard ? 'flex' : 'none';
  if (endcard) {
    for (const el of [ui.pill, ui.title, ui.caption, ui.big]) el.style.display = 'none';
    const lp = easeOutBack((t - (END_T0 + 1.04)) / 0.4);
    $('endLogo').style.transform = `scale(${Math.max(0, 0.3 + 0.7 * lp)})`; $('endLogo').style.opacity = clamp((t - (END_T0 + 0.95)) / 0.1);
    ui.end.style.opacity = clamp((t - END_T0) / 0.25);
    return;
  }
  ui.pill.style.display = ui.title.style.display = ui.caption.style.display = 'block';
  const shot = SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const k = clamp((t - shot.t0) / (shot.t1 - shot.t0)), since = t - shot.t0;

  // ---- the build
  let built = 0;
  for (const p of pops) {
    const s = popScale(t, popAt(p.d));
    if (s > 0.5) built++;
    if (p.obj) { p.obj.visible = s > 0.001; p.obj.scale.setScalar(Math.max(s, 0.001) * (p.base || 1)); }
    else field.setScale(p.f, s);
  }
  field.commit();
  for (const r of risers) { const s = t < FLASH ? 1 : clamp((t - popAt(r.d)) / 0.7); r.o.visible = s > 0.001; r.body.scale.set(1, Math.max(easeInOut(s), 0.001), 1);
    if (r.o.userData.sign) r.o.userData.sign.visible = s > 0.95; if (r.o.userData.manager) r.o.userData.manager.visible = s > 0.95; }
  const hs = t < FLASH ? 1 : clamp((t - popAt(200)) / 0.5); hill.visible = hs > 0.001; hill.scale.set(1, Math.max(hs, 0.001), 1);
  const es = popScale(t, popAt(60)); ext.visible = es > 0.001; ext.scale.setScalar(Math.max(es, 0.001));
  const xs = popScale(t, popAt(300)); xmas.visible = xs > 0.001; xmas.scale.setScalar(Math.max(xs, 0.001));
  setSign(Math.max(1, Math.round(260 * built / pops.length)));
  setCityLights(lightsK(t));
  crowd.update(t, (i, x, z) => (t < FLASH ? 1 : popScale(t, popAt(Math.hypot(x - ENTR.x, z - ENTR.z)) + 0.2, 0.3)));
  onlookers.visible = t < FLASH || t > BUILD1;
  pigeon.userData.animate(t); kevinTag.position.y = 12.3 + Math.sin(t * 2.2) * 0.08;

  // ---- camera
  let focus;
  if (shot.orbit) {
    const o = shot.orbit, e = easeInOut(k), ang = lerp(o.a[0], o.a[1], e), r = lerp(o.r[0], o.r[1], e), h = lerp(o.h[0], o.h[1], e);
    camera.position.set(o.c.x + Math.sin(ang) * r, h, o.c.z + Math.cos(ang) * r); camera.up.set(0, 1, 0); camera.lookAt(o.c.x, o.y, o.c.z); focus = o.c.clone();
  } else {
    const e = smooth(k) * 0.6 + k * 0.4;
    camera.position.lerpVectors(shot.cam[0], shot.cam[1], e);
    const tgt = new THREE.Vector3().lerpVectors(shot.at[0], shot.at[1], e); camera.up.set(0, 1, 0); camera.lookAt(tgt); focus = tgt.clone().setY(0);
  }
  camera.fov = 52 - 4 * (1 - easeOut(since / 0.25)) * (shot.t0 === 0 ? 0 : 1);
  if (shot.flash) built = pops.length;
  camera.updateProjectionMatrix();
  applyLook(LOOKS[typeof shot.look === 'function' ? shot.look(t) : shot.look], focus, shot.span);
  renderer.render(scene, camera);

  // ---- overlays
  ui.pill.textContent = typeof shot.pill === 'function' ? shot.pill(t) : shot.pill;
  setTitle(typeof shot.title === 'function' ? shot.title(t) : shot.title);
  const pop = shot.t0 <= FLASH ? 1 : easeOutBack(since / 0.25);
  ui.title.style.transform = `scale(${0.85 + 0.15 * pop})`; ui.pill.style.transform = `translateX(-50%) scale(${0.85 + 0.15 * pop})`;
  const bigOn = !!shot.big && t >= BUILD0;
  ui.big.style.display = bigOn ? 'block' : 'none';
  if (bigOn) { ui.bigN.textContent = built.toLocaleString('en-US'); ui.big.style.transform = `scale(${0.6 + 0.4 * easeOutBack((t - BUILD0) / 0.3)})`; }

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
window.sceneReady = document.fonts.ready.then(() => { setSign(1); return true; });
if (!params.has('render')) {
  window.sceneReady.then(() => { const t0 = performance.now(); const loop = () => { setTime(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); }; loop(); });
}
