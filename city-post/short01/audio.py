"""Soundtrack for the Day 1 vs Day 5 short: full-energy groove from frame 1, a rewind whoosh, a crackle of
pops while the city builds, pops on each quick cut, the light switch, and the voiced sonic logo at the end."""
import json, os, sys, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, ".."))
from sfxlib import SR, bass_note, chime, clap, fft_filter, hat, impact, kick, noise, pad_chord, pluck, pop, riser, t_axis, thunk, tick, whoosh  # noqa: E402

TL = json.load(open(os.path.join(HERE, "timeline.json"))); DUR = TL["duration"]; N = int(DUR * SR) + SR
BEAT = {b["id"]: b for b in TL["beats"]}
def W(bid, pre, off=0.0):
    for w, t in BEAT[bid]["words"]:
        if w.lower().startswith(pre): return t
    return BEAT[bid]["start"] + off
def place(dst, sig, t0, g=1.0):
    i = int(round(t0 * SR));
    if 0 <= i < len(dst): j = min(len(dst), i + len(sig)); dst[i:j] += sig[: j - i] * g

FLASH = 0.6; build0 = W("hook", "empty", 1.4) + 0.15; build1 = BEAT["rule"]["end"]; END_T0 = TL["voice_end"] + 0.3
cuts = [BEAT["weird"]["start"] - 0.08] + [W("weird", w) - 0.08 for w in ("rubber", "giant", "taco", "castle")] + [BEAT["lights"]["start"] - 0.08, BEAT["cta"]["start"] - 0.08]
lights = W("lights", "lights", 1.5)

PROG = [([60, 64, 67, 72], 36), ([59, 62, 67, 71], 43), ([57, 60, 64, 69], 45), ([57, 60, 65, 69], 41)]
ARP = [0, 1, 2, 3, 2, 1, 2, 3]
L, R = np.zeros(N), np.zeros(N); drums = np.zeros(N); keys = np.zeros(N); bass = np.zeros(N)
bar = 1.875  # 128 BPM
for b in range(int(END_T0 / bar) + 1):
    bt = b * bar; notes, root = PROG[b % 4]
    pad = fft_filter(pad_chord(notes, bar + 0.4), hi=4500); place(L, pad, bt, 0.42); place(R, np.roll(pad, int(0.011 * SR)), bt, 0.42)
    for s in range(8):
        st = bt + s * bar / 8
        if st >= END_T0 - 0.05: continue
        place(keys, pluck(notes[ARP[s]] + 12), st, 0.3)
        place(bass, bass_note(root + (12 if s in (3, 7) else 0), bar / 8 * 0.9), st, 0.42)
        if s % 2 == 0: place(drums, kick(), st, 0.75)
        if s in (2, 6): place(drums, clap(), st, 0.32)
        place(drums, hat(s % 2 == 1), st, 0.2 if s % 2 else 0.12)
music = keys + bass + drums

sfx = np.zeros(N)
rw = whoosh(0.5)[::-1]; place(sfx, rw, FLASH - 0.35, 0.8)                 # rewind
place(sfx, pop(1500, 700, 0.12), 0.05, 0.4)
rng = np.random.default_rng(5)
for i in range(70):                                                          # the city building itself
    tt = build0 + (build1 - build0 - 0.4) * (i / 70) ** 1.1
    place(sfx, pop(600 + rng.random() * 700, 250 + rng.random() * 150, 0.09), tt, 0.28)
rt = t_axis(build1 - build0); place(sfx, fft_filter(noise(len(rt)), hi=170) * np.sin(np.pi * rt / (build1 - build0)), build0, 0.8)
for c in cuts:
    place(sfx, whoosh(0.4), c - 0.22, 0.4); place(sfx, pop(1200, 480), c + 0.08, 0.45)
place(sfx, thunk(), lights, 1.0); place(sfx, impact(), lights + 0.25, 0.4)
for k, m in enumerate((72, 76, 79, 84)): place(sfx, chime(m, 1.4), lights + 0.35 + k * 0.07, 0.2)
with wave.open(os.path.join(HERE, "..", "..", "brand", "assets", "audio", "sonic-logo-voice.wav")) as w:
    sl = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(float).reshape(-1, 2).mean(axis=1) / 32768
place(sfx, sl, END_T0, 1.1)

with wave.open(os.path.join(HERE, "out", "voice.wav")) as w:
    vsr = w.getframerate(); v = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(float) / 32768
v = np.interp(np.arange(int(len(v) * SR / vsr)) / SR, np.arange(len(v)) / vsr, v)
voice = np.zeros(N); voice[: min(N, len(v))] = fft_filter(v, lo=80)[:N]; voice /= np.abs(voice).max() + 1e-9
env = np.convolve(np.abs(voice), np.ones(int(0.1 * SR)) / int(0.1 * SR), mode="same"); env = np.clip(env / (env.max() + 1e-9) * 4, 0, 1)
duck = 1 - np.clip(np.convolve(np.abs(drums), np.ones(int(0.05 * SR)) / int(0.05 * SR), mode="same") * 0.6, 0, 0.35)
bed = 1 - 0.62 * env
fade = np.ones(N); i0 = int((END_T0 - 0.1) * SR); fade[i0:] = np.clip(1 - (np.arange(N - i0) / (0.4 * SR)), 0, 1)
Lm = (L * duck + music * 0.75) * 0.8 * bed * fade + sfx * 0.85 + voice * 0.95
Rm = (R * duck + music * 0.75) * 0.8 * bed * fade + sfx * 0.85 + voice * 0.95
n = int(DUR * SR); mix = np.stack([Lm[:n], Rm[:n]], axis=1)
mix[-int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))[:, None]
mix = np.tanh(mix * 1.2) / np.tanh(1.2); mix /= np.abs(mix).max() / 0.89
with wave.open(os.path.join(HERE, "out", "soundtrack.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"wrote short01/out/soundtrack.wav ({DUR:.1f}s)")
