// Voiceover: synthesises each script line with the open-source Kokoro-82M model (Apache-2.0),
// fits it into its slot on the timeline, and writes:
//   out/voice.wav       — the full 40 s narration track
//   captions.js         — word start times for the karaoke captions (imported by main.js)
//
//   node voice.mjs [--voice af_heart] [--speed 1.1]
//
// Requires: npm i kokoro-js   (downloads the model from Hugging Face on first run)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(process.env.KOKORO_DIR || ROOT, 'package.json'));
const { KokoroTTS } = require('kokoro-js');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') && a.push([x.slice(2), arr[i + 1]]), a), []));
const VOICE = args.voice || 'af_heart';
const BASE_SPEED = Number(args.speed || 1.1);
const SR = 24000;
const DURATION = 40;

// [start time (s), latest end (s), text]. Each line starts when its caption should appear.
const LINES = [
  [0.0, 2.0, 'This city has one resident.'],
  [2.05, 2.85, 'Me.'],
  [2.85, 5.75, 'No neighbours, no shops, just empty roads.'],
  [5.8, 6.95, "But here's the plan."],
  [7.0, 10.75, 'Every video, this city grows, built by real people.'],
  [10.85, 11.6, 'You.'],
  [11.65, 15.25, "Rule one: follow, and you're officially a citizen."],
  [15.3, 19.55, "Rule two: comment, and I'll build you a house, with your name on it."],
  [19.65, 22.9, 'Rule three: the most liked comment rules the city.'],
  [23.0, 25.2, 'Whatever it says, I build.'],
  [25.3, 26.55, 'No matter what.'],
  [26.65, 28.55, 'So, what do we build first?'],
  [28.65, 29.9, 'A, a hospital.'],
  [30.0, 31.4, 'B, a stadium.'],
  [31.5, 33.2, 'Or C, a giant mall.'],
  [33.3, 34.6, 'Vote in the comments.'],
  [34.65, 36.9, 'Results next episode.'],
];

function trim(x, thr = 0.01) {
  let a = 0, b = x.length - 1;
  while (a < b && Math.abs(x[a]) < thr) a++;
  while (b > a && Math.abs(x[b]) < thr) b--;
  return x.subarray(Math.max(0, a - Math.round(0.01 * SR)), Math.min(x.length, b + Math.round(0.03 * SR)));
}

// Word onsets: find pauses (commas, colons) in the clip by energy, then spread the words of each
// pause-delimited phrase in proportion to their length (letters + a little per word).
function wordTimes(clip, text) {
  const words = text.split(/\s+/);
  const win = Math.round(0.02 * SR);
  const env = [];
  for (let i = 0; i < clip.length; i += win) {
    let s = 0; for (let j = i; j < Math.min(clip.length, i + win); j++) s += clip[j] * clip[j];
    env.push(Math.sqrt(s / win));
  }
  const thr = Math.max(...env) * 0.06;
  // silent runs of >= 100 ms are phrase gaps
  const gaps = [];
  let run = 0;
  env.forEach((e, i) => { if (e < thr) run++; else { if (run >= 5 && i - run > 0) gaps.push([(i - run) * win / SR, i * win / SR]); run = 0; } });
  // phrases split at punctuation
  const phrases = [];
  let cur = [];
  words.forEach((w) => { cur.push(w); if (/[,:;]$/.test(w)) { phrases.push(cur); cur = []; } });
  if (cur.length) phrases.push(cur);
  const total = clip.length / SR;
  // pick phrase boundaries: the longest gaps, in time order, one per punctuation break
  const useGaps = gaps.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0])).slice(0, phrases.length - 1).sort((a, b) => a[0] - b[0]);
  const spans = [];
  let s = 0;
  phrases.forEach((p, i) => {
    const g = useGaps[i];
    const e = g ? g[0] : total;
    spans.push([s, e]);
    s = g ? g[1] : e;
  });
  if (useGaps.length < phrases.length - 1) { // fallback: proportional over whole clip
    spans.length = 0;
    const lens = phrases.map((p) => p.join(' ').length);
    const sum = lens.reduce((a, b) => a + b, 0);
    let acc = 0;
    lens.forEach((l) => { spans.push([acc / sum * total, (acc + l) / sum * total]); acc += l; });
  }
  const out = [];
  phrases.forEach((p, i) => {
    const [a, b] = spans[i];
    const w = p.map((x) => x.replace(/[^A-Za-z']/g, '').length + 1.5);
    const sum = w.reduce((x, y) => x + y, 0);
    let acc = 0;
    p.forEach((word, k) => { out.push([word, a + (acc / sum) * (b - a)]); acc += w[k]; });
  });
  return out;
}

const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const track = new Float32Array(Math.round(DURATION * SR));
const captions = [];

for (const [t0, tEnd, text] of LINES) {
  const slot = tEnd - t0;
  let speed = BASE_SPEED, clip;
  for (let attempt = 0; attempt < 6; attempt++) {
    const audio = await tts.generate(text, { voice: VOICE, speed });
    clip = trim(audio.audio);
    if (clip.length / SR <= slot || speed >= 1.6) break;
    speed = Math.min(1.6, speed * (clip.length / SR) / slot * 1.02);
  }
  const len = clip.length / SR;
  const i0 = Math.round(t0 * SR);
  for (let i = 0; i < clip.length && i0 + i < track.length; i++) track[i0 + i] += clip[i];
  captions.push(wordTimes(clip, text).map(([w, t]) => [w, +(t0 + t).toFixed(3)]));
  console.log(`${t0.toFixed(2)}s  ${len.toFixed(2)}s / ${slot.toFixed(2)}s  x${speed.toFixed(2)}  ${text}`);
}

// normalise narration to -1 dBFS peak
let peak = 0; for (const v of track) peak = Math.max(peak, Math.abs(v));
const g = 0.89 / (peak || 1);
const pcm = Buffer.alloc(track.length * 2);
track.forEach((v, i) => pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * g * 32767))), i * 2));
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(SR, 24);
hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out', 'voice.wav'), Buffer.concat([hdr, pcm]));

const js = `// Generated by voice.mjs (${VOICE}) — word start times in seconds, one array per caption line.\n` +
  `export const CAPTIONS = ${JSON.stringify(captions).replace(/\],\[\[/g, '],\n  [[').replace(/^\[\[\[/, '[\n  [[').replace(/\]\]\]$/, ']]\n]')};\n`;
fs.writeFileSync(path.join(ROOT, 'captions.js'), js);
console.log('wrote out/voice.wav and captions.js');
