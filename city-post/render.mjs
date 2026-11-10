// Render the post to MP4: serves this folder, drives setTime(t) in headless Chromium,
// screenshots every frame and pipes them into ffmpeg.
//
//   node render.mjs                         -> out/post.mp4 (1080x1920, 30 fps)
//   node render.mjs --stills 1,4,9          -> out/still_<t>.png for quick checks
//   node render.mjs --fps 30 --handle @me --name @JANE --city "NEW TOWN" --pop 582
//   node render.mjs --audio voice.mp3       -> mux a voiceover / music track
//   node render.mjs --stills 11 --clean 1   -> scene only, no titles/captions (for thumbnails)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const FPS = Number(args.fps || 30);
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const q = new URLSearchParams({ render: '1' });
for (const k of ['handle', 'name', 'city', 'pop', 'clean']) if (args[k]) q.set(k, args[k]);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page error:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
await page.goto(`http://localhost:${port}/index.html?${q}`);
await page.waitForFunction(() => window.sceneReady && window.setTime);
await page.evaluate(() => window.sceneReady);
const stage = await page.$('#stage');

if (args.stills) {
  for (const t of String(args.stills).split(',').map(Number)) {
    await page.evaluate((t) => window.setTime(t), t);
    await stage.screenshot({ path: path.join(OUT, `still_${t}.png`) });
    console.log('still', t);
  }
} else {
  const duration = await page.evaluate(() => window.DURATION);
  const frames = Math.round(duration * FPS);
  const outFile = path.join(OUT, 'post.mp4');
  const ff = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  if (args.audio) ff.push('-i', args.audio, '-c:a', 'aac', '-b:a', '192k', '-shortest');
  ff.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile);
  const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'ignore', 'inherit'] });
  const start = Date.now();
  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.setTime(t), f / FPS);
    const buf = await stage.screenshot({ type: 'jpeg', quality: 93 });
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
    if (f % 30 === 0) {
      const el = (Date.now() - start) / 1000;
      console.log(`frame ${f}/${frames}  ${el.toFixed(0)}s elapsed, ~${((el / (f + 1)) * (frames - f - 1)).toFixed(0)}s left`);
    }
  }
  enc.stdin.end();
  await new Promise((r) => enc.on('close', r));
  console.log('wrote', outFile);
}
await browser.close();
server.close();
