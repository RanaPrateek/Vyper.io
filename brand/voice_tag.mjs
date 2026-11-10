// Brand voice tag: the series narrator (Kokoro-82M, voice af_heart) saying the name.
//   node brand/voice_tag.mjs ["Population: you."]   -> brand/assets/audio/voice-tag-raw.wav (24 kHz mono)
// Needs kokoro-js (see city-post/package.json). Behind an HTTPS proxy run with NODE_USE_ENV_PROXY=1.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(process.env.KOKORO_DIR || path.join(HERE, '..', 'city-post'), 'package.json'));
const { KokoroTTS } = require('kokoro-js');

const text = process.argv[2] || 'Population: you.';
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const audio = await tts.generate(text, { voice: process.env.VOICE || 'af_heart', speed: 0.95 });
const x = audio.audio, SR = audio.sampling_rate;
const pcm = Buffer.alloc(x.length * 2);
x.forEach((v, i) => pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), i * 2));
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
const out = path.join(HERE, 'assets', 'audio', 'voice-tag-raw.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([h, pcm]));
console.log('wrote', out, (x.length / SR).toFixed(2) + 's');
