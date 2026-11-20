// Narration for an episode: one continuous Kokoro take per story beat (natural rhythm), joined with
// short pauses. Writes <ep>/out/voice.wav and <ep>/out/beats.json ({id, start, end, show} per beat).
//   node tools/beats_voice.mjs ep02
// Run with NODE_USE_ENV_PROXY=1 behind an HTTPS proxy (first run downloads the model).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const EP = path.join(ROOT, process.argv[2] || 'ep02');
const require = createRequire(path.join(process.env.KOKORO_DIR || ROOT, 'package.json'));
const { KokoroTTS } = require('kokoro-js');

const script = JSON.parse(fs.readFileSync(path.join(EP, 'script.json'), 'utf8'));
const cfg = JSON.parse(fs.readFileSync(path.join(EP, 'config.json'), 'utf8'));
const vars = { followers: cfg.followers, previous_followers: cfg.previous_followers, houses: cfg.houses ?? 15, ...cfg.poll, ...(cfg.vars || {}) };
// a beat can offer variants, chosen by a config key: { "variant_by": "milestone_state", "variants": { "reached": {...}, "progress": {...} } }
const pick = (b) => (b.variants ? { ...b, ...b.variants[cfg[b.variant_by]] } : b);
const fill = (s) => s.replace(/\{([^}]+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));

const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const SR = 24000;
const trim = (x, thr = 0.008) => {
  let a = 0, b = x.length - 1;
  while (a < b && Math.abs(x[a]) < thr) a++;
  while (b > a && Math.abs(x[b]) < thr) b--;
  return x.subarray(Math.max(0, a - Math.round(0.02 * SR)), Math.min(x.length, b + Math.round(0.06 * SR)));
};

const lead = 0.15; // a breath before the first word
const clips = [], beats = [];
let t = lead;
for (const b0 of script.beats) {
  const b = pick(b0);
  const say = fill(b.say), show = fill(b.show || b.say);
  const audio = await tts.generate(say, { voice: script.voice || 'af_heart', speed: script.speed || 1.05 });
  const clip = trim(audio.audio);
  const dur = clip.length / SR;
  clips.push([t, clip]);
  beats.push({ id: b.id, start: +t.toFixed(3), end: +(t + dur).toFixed(3), say, show });
  console.log(`${b.id.padEnd(10)} ${t.toFixed(2)}s +${dur.toFixed(2)}s  ${say}`);
  t += dur + (b.pause ?? 0.3);
}
const total = Math.ceil((t + 0.1) * SR);
const track = new Float32Array(total);
for (const [t0, c] of clips) track.set(c, Math.round(t0 * SR));
let peak = 0; for (const v of track) peak = Math.max(peak, Math.abs(v));
const pcm = Buffer.alloc(track.length * 2);
track.forEach((v, i) => pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * 0.89 / peak)) * 32767), i * 2));
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
fs.mkdirSync(path.join(EP, 'out'), { recursive: true });
fs.writeFileSync(path.join(EP, 'out', 'voice.wav'), Buffer.concat([h, pcm]));
fs.writeFileSync(path.join(EP, 'out', 'beats.json'), JSON.stringify({ voice_end: +(t).toFixed(3), beats }, null, 1));
console.log(`voice: ${(track.length / SR).toFixed(2)}s -> ${path.relative(ROOT, path.join(EP, 'out', 'voice.wav'))}`);
