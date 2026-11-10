// Raster exports + layout templates for the brand kit (headless Chromium via Playwright).
//   node brand/render.mjs [--handle @population.you] [--ep 1] [--day 0] [--title "POPULATION: 1"]
// Run `python3 brand/build.py` first (vector logos) and grab scene frames with
// `node city-post/render.mjs --stills 9.4,14.2 --clean 1`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const A = (p) => path.join(HERE, 'assets', p);
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') && a.push([x.slice(2), arr[i + 1]]), a), []));
const HANDLE = args.handle || '@population.you';
const EP = args.ep || '1', DAY = args.day || '0', TITLE = args.title || 'POPULATION: 1';

const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
const svgUri = (n) => dataUri(A(n), 'image/svg+xml');

const BASE_CSS = `
  * { box-sizing: border-box; } html, body { margin: 0; }
  body { font-family: 'Inter', sans-serif; }
  .title { font-family: 'Inter Display','Inter',sans-serif; font-weight: 900; color: #fff; letter-spacing: 1px; line-height: 1;
           text-shadow: 0 5px 0 rgba(0,0,0,.55), 0 0 22px rgba(0,0,0,.45); white-space: nowrap; }
  .pill { display: inline-block; background: #fff; color: #111; font-weight: 800; border-radius: 40px; box-shadow: 0 4px 14px rgba(0,0,0,.25); }
`;

// road grid pattern, same drawing rules as the episode's ground texture
const GRID_JS = `
function gridPattern(ctx, W, H, tile, angle) {
  const c = document.createElement('canvas'); c.width = c.height = tile; const g = c.getContext('2d');
  const s = tile / 50, r = 5;
  g.fillStyle = '#3a4558'; g.fillRect(0, 0, tile, tile);
  g.fillStyle = '#9ea4ac'; g.fillRect(r*s, r*s, 40*s, 40*s);
  g.fillStyle = '#c8b39b'; g.fillRect((r+1.4)*s, (r+1.4)*s, (40-2.8)*s, (40-2.8)*s);
  g.fillStyle = '#f2f2f2';
  for (let x = 12; x < 38; x += 6) for (const e of [0, tile]) { g.fillRect(x*s, e-0.18*s, 3*s, 0.36*s); g.fillRect(e-0.18*s, x*s, 0.36*s, 3*s); }
  for (const x0 of [r+0.6, 50-r-3.6]) for (const y0 of [0, 50-r]) for (let k = 0.4; k < r-0.4; k += 1) {
    g.fillRect(x0*s, (y0+k)*s, 3*s, 0.5*s); g.fillRect((y0+k)*s, x0*s, 0.5*s, 3*s); }
  ctx.save(); ctx.translate(W/2, H/2); ctx.rotate(angle); ctx.fillStyle = ctx.createPattern(c, 'repeat');
  ctx.fillRect(-W*1.5, -H*1.5, W*3, H*3); ctx.restore();
}
function plot(ctx, W, H, tile, angle, i, j, label) {
  ctx.save(); ctx.translate(W/2, H/2); ctx.rotate(angle);
  const s = tile/50, x = i*tile + 6.5*s, y = j*tile + 6.5*s, w = 37*s;
  ctx.fillStyle = 'rgba(255,150,60,0.16)'; ctx.fillRect(x, y, w, w);
  ctx.setLineDash([w/9, w/14]); ctx.lineWidth = w/40; ctx.strokeStyle = '#ff8a2a'; ctx.strokeRect(x, y, w, w);
  if (label) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '800 ' + (w*0.5) + 'px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x+w/2, y+w/2+w*0.03); }
  ctx.restore();
}`;

function bannerHtml(W, H, logoW, tagSize) {
  return `<!DOCTYPE html><html><head><style>${BASE_CSS}
    #c { position: absolute; inset: 0; }
    .shade { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(13,18,29,.15) 0%, rgba(13,18,29,.55) 70%); }
    .mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .tag { margin-top: ${tagSize * 0.6}px; color: #fff; font-weight: 800; font-size: ${tagSize}px;
           text-shadow: 0 3px 0 rgba(0,0,0,.5), 0 0 16px rgba(0,0,0,.5); }
    .tag b { color: #ff8a1c; }
    .handle { margin-top: ${tagSize * 0.5}px; font-size: ${tagSize * 0.62}px; font-weight: 800; padding: ${tagSize * 0.18}px ${tagSize * 0.6}px; }
  </style></head><body style="width:${W}px;height:${H}px;position:relative;overflow:hidden">
    <canvas id="c" width="${W}" height="${H}"></canvas><div class="shade"></div>
    <div class="mid"><img src="${svgUri('logo-board.svg')}" width="${logoW}">
      <div class="tag">A city built by its <b>followers</b>.</div>
      <div class="pill handle">${HANDLE}</div></div>
    <script>{ ${GRID_JS}
      const ctx = document.getElementById('c').getContext('2d'); const T = ${Math.round(H / 3.2)}, ang = -0.14;
      gridPattern(ctx, ${W}, ${H}, T, ang); }
    </script></body></html>`;
}

function coverHtml() {
  const bg = dataUri(A('frames/city-aerial.png'), 'image/png');
  return `<!DOCTYPE html><html><head><style>${BASE_CSS}
    body { width: 1080px; height: 1920px; position: relative; overflow: hidden; background: url(${bg}) center/cover; }
    .grad { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 62%, rgba(0,0,0,.55) 100%); }
    .pill { position: absolute; top: 236px; left: 50%; transform: translateX(-50%); font-size: 34px; padding: 10px 26px; }
    .title { position: absolute; top: 330px; left: 0; right: 0; text-align: center; font-size: 112px; }
    .logo { position: absolute; bottom: 150px; left: 50%; transform: translateX(-50%); }
    .ep { position: absolute; bottom: 92px; left: 0; right: 0; text-align: center; color: #fff; font-weight: 800; font-size: 34px;
          letter-spacing: 6px; text-shadow: 0 3px 8px rgba(0,0,0,.6); }
  </style></head><body><div class="grad"></div>
    <div class="pill">DAY ${DAY}</div><div class="title" id="t">${TITLE}</div>
    <img class="logo" src="${svgUri('logo-board.svg')}" width="420">
    <div class="ep">EPISODE ${EP}</div>
    <script>{ const t=document.getElementById('t'); let fs=112; const sp=document.createElement('span'); sp.textContent=t.textContent; t.textContent=''; t.appendChild(sp);
      while (sp.offsetWidth > 1000 && fs > 50) { fs -= 2; t.style.fontSize = fs + 'px'; } }</script>
  </body></html>`;
}

const svgPage = (n, W, H, bg = 'transparent') =>
  `<!DOCTYPE html><html><body style="margin:0;background:${bg}"><img src="${svgUri(n)}" width="${W}" height="${H}" style="display:block"></body></html>`;

const JOBS = [
  ['avatar.png', svgPage('avatar.svg', 1024, 1024), 1024, 1024],
  ['avatar-400.png', svgPage('avatar.svg', 400, 400), 400, 400],
  ['logo.png', svgPage('logo.svg', 2400, 1640), 2400, 1640, true],
  ['logo-board.png', svgPage('logo-board.svg', 1200, 640), 1200, 640, true],
  ['wordmark.png', svgPage('wordmark.svg', 0, 0).replace(' width="0" height="0"', ' height="240"'), null, 240, true],
  ['wordmark-white.png', svgPage('wordmark-white.svg', 0, 0).replace(' width="0" height="0"', ' height="240"'), null, 240, true],
  ['banner-youtube.png', bannerHtml(2560, 1440, 760, 54), 2560, 1440],
  ['banner-x.png', bannerHtml(1500, 500, 420, 34), 1500, 500],
  [`cover-ep${EP}.png`, coverHtml(), 1080, 1920],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2560, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page error:', e.message));
fs.mkdirSync(A('png'), { recursive: true });
for (const [name, html, W, H, transparent] of JOBS) {
  await page.setViewportSize({ width: W || 2560, height: W ? H : 1920 }); // page = asset size
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); // let canvases paint
  let clip;
  if (W) clip = { x: 0, y: 0, width: W, height: H };
  else { const b = await page.$eval('img', (e) => ({ w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })); clip = { x: 0, y: 0, width: Math.ceil(b.w), height: Math.ceil(b.h) }; }
  await page.screenshot({ path: A(path.join('png', name)), clip, omitBackground: !!transparent });
  console.log('wrote brand/assets/png/' + name);
}
await browser.close();
