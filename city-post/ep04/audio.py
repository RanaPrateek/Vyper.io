"""Episode 4 soundtrack: music bed + effects keyed to timeline.json (same cue rules as ep04/main.js),
narration from out/voice.wav (music ducked under it), and the brand sonic logo on the end card.

    python3 ep04/audio.py        -> ep04/out/soundtrack.wav
"""
import json
import os
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
from sfxlib import (SR, rng, bass_note, chime, clap, fft_filter, hat, impact, kick, noise, pad_chord,  # noqa: E402
                    pluck, pop, riser, t_axis, thunk, tick, whoosh)

TL = json.load(open(os.path.join(HERE, "timeline.json")))
CFG = json.load(open(os.path.join(HERE, "config.json")))
DUR = TL["duration"]
N = int(DUR * SR) + SR
BEAT = {b["id"]: b for b in TL["beats"]}


def W(bid, pred, off=0.0):
    for w, t in BEAT[bid]["words"]:
        if pred(w):
            return t
    return BEAT[bid]["start"] + off


def place(dst, sig, t0, gain=1.0):
    i = int(round(t0 * SR))
    if i < 0 or i >= len(dst):
        return
    j = min(len(dst), i + len(sig))
    dst[i:j] += sig[: j - i] * gain


# ---------------------------------------------------------------- cues (mirror ep04/main.js)
ORDER = ["hook", "lights", "montage", "website", "emijinx", "vote", "ellis", "queen", "asking", "quick", "next", "end"]
shot_t0 = {b: (0 if i == 0 else BEAT[b]["start"] - 0.12) for i, b in enumerate(ORDER)}
END_T0 = TL["voice_end"] + 0.15
first = lambda bid, pre: W(bid, lambda w: w.lower().startswith(pre.lower()), 0)
today = first("hook", "Today"); lights_on = first("hook", "lights")
names_t = [t for w, t in BEAT["montage"]["words"] if w.rstrip(".").lower() in ("dagmar", "joe", "natiii", "layla", "essa", "eloise")]
xmas_t = first("emijinx", "Done")
castle_t = first("vote", "Castle"); town_t = first("vote", "Town")
pct = [t for w, t in BEAT["vote"]["words"] if "%" in w]; win = pct[-1]
ellis_t = first("ellis", "runs"); queen_t = first("queen", "Your")
cheese_t = first("asking", "Fine"); kebab_t = first("asking", "boss")
quick_t = [first("quick", "Skyla"), first("quick", "taco"), first("quick", "Chlo"), first("quick", "Penny")]
tags = [W("next", lambda w, L=L: w.startswith(L + ","), 1 + i) for i, L in enumerate("ABC")]
CARDS = [shot_t0["emijinx"], shot_t0["ellis"], shot_t0["queen"], first("asking", "Arran"), first("asking", "Chris"),
         shot_t0["quick"], quick_t[0], quick_t[2], quick_t[3]]
# compat names used by the music section
mall_win = win
# ---------------------------------------------------------------- music: I–V–vi–IV, 120 BPM
PROG = [([60, 64, 67, 72], 36), ([59, 62, 67, 71], 43), ([57, 60, 64, 69], 45), ([57, 60, 65, 69], 41)]
ARP = [0, 1, 2, 3, 2, 1, 2, 3]
beat_s, bar_s = 0.5, 2.0
L, R = np.zeros(N), np.zeros(N)
drums, keys, bass = np.zeros(N), np.zeros(N), np.zeros(N)


def section(t):
    if t < lights_on:
        return "intro"
    if mall_win - 2.2 <= t < mall_win:
        return "break"          # hold the breath before the winner
    if BEAT["asking"]["start"] - 0.12 <= t < BEAT["quick"]["start"] - 0.12:
        return "sneaky"         # half-time, plucky: the pigeon
    if t >= END_T0 - 0.2:
        return "out"
    return "full"


bars = int(np.ceil(DUR / bar_s))
for b in range(bars):
    bt = b * bar_s
    notes, root = PROG[b % 4]
    sec = section(bt + 0.01)
    if sec == "out":
        break
    pad = fft_filter(pad_chord(notes, bar_s + 0.5), hi=1600 if sec in ("intro", "break") else 4200)
    place(L, pad, bt, 0.42)
    place(R, np.roll(pad, int(0.011 * SR)), bt, 0.42)
    for s in range(8):
        st = bt + s * beat_s / 2
        sec = section(st)
        if sec == "out":
            continue
        if sec in ("full", "intro") and (sec == "full" or s % 2 == 0):
            place(keys, pluck(notes[ARP[s]] + 12), st, 0.32 if sec == "full" else 0.22)
        if sec == "sneaky" and s in (0, 3, 6):
            place(keys, pluck(notes[ARP[s]] + 24, 0.18), st, 0.3)
        if sec == "full":
            place(bass, bass_note(root + (12 if s in (3, 7) else 0), beat_s / 2 * 0.9), st, 0.42)
            if s % 2 == 0:
                place(drums, kick(), st, 0.7)
            if s in (2, 6):
                place(drums, clap(), st, 0.3)
            place(drums, hat(s % 2 == 1), st, 0.18 if s % 2 else 0.1)
        if sec == "sneaky":
            if s in (0, 5):
                place(bass, bass_note(root, beat_s * 0.8), st, 0.4)
            if s in (0,):
                place(drums, kick(), st, 0.55)
            if s in (4,):
                place(drums, clap(), st, 0.22)
music = keys + bass + drums

# ---------------------------------------------------------------- effects
sfx = np.zeros(N)
for b in ORDER[1:]:
    place(sfx, whoosh(), shot_t0[b] - 0.3, 0.4)
prev = CFG["previous_followers"]; last = prev
for i in range(1, 600):
    tt = today + i / 600 * 1.2
    v = round(prev + (CFG["followers"] - prev) * (1 - (1 - i / 600) ** 3))
    if v != last: place(sfx, tick(), tt, 0.35)
    last = v
# lights on: a big switch "ka-chunk", flicker buzzes, then a warm electric hum swelling under the aerial
place(sfx, thunk(), lights_on, 1.0); place(sfx, impact(), lights_on + 0.3, 0.45)
for dt in (0.12, 0.22, 0.32):
    bz = t_axis(0.06); place(sfx, np.sign(np.sin(2 * np.pi * 100 * bz)) * np.exp(-bz * 40) * 0.25, lights_on + dt, 0.5)
ht = t_axis(3.0)
hum = (np.sin(2 * np.pi * 100 * ht) + 0.5 * np.sin(2 * np.pi * 200 * ht)) * np.minimum(1, ht * 2) * np.minimum(1, (3 - ht) * 2)
place(sfx, fft_filter(hum, hi=400), lights_on + 0.4, 0.12)
for k, m in enumerate((72, 76, 79, 84)):
    place(sfx, chime(m, 1.6), lights_on + 0.45 + k * 0.08, 0.2)
for i, tt in enumerate(names_t):
    place(sfx, pop(900 + i * 80, 380, 0.11), tt, 0.5)
place(sfx, riser(1.4) * 0.5, shot_t0["website"] + 0.4, 0.3)
for tt in CARDS:
    place(sfx, pop(1100, 420), tt + 0.25, 0.4)
place(sfx, pop(1500, 700, 0.12), xmas_t, 0.5)
for k, m in enumerate((88, 91, 95)):
    place(sfx, chime(m, 1.2), xmas_t + 0.06 * k, 0.15)
place(sfx, pop(900, 350), castle_t, 0.6); place(sfx, pop(1000, 380), town_t, 0.6)
place(sfx, riser(1.4), win - 1.4, 0.45); place(sfx, impact(), win, 0.6)
# splash: filtered noise burst
st = t_axis(1.2)
splash = fft_filter(noise(len(st)), lo=800, hi=7000) * np.exp(-st * 3.5) * np.minimum(1, st * 80)
place(sfx, splash, win + 0.4, 0.7); place(sfx, splash * 0.6, win + 1.3, 0.5)
place(sfx, pop(1300, 600, 0.12), ellis_t, 0.55)
for k, m in enumerate((60, 64, 67, 72, 76)):   # fanfare for the queen
    place(sfx, chime(m, 2.2), queen_t + k * 0.11, 0.28)
place(sfx, impact(), queen_t, 0.35)
place(sfx, pop(700, 260, 0.16), cheese_t, 0.8); place(sfx, pop(800, 300, 0.14), kebab_t, 0.7)
for tt in quick_t:
    place(sfx, pop(1200, 500), tt, 0.5)
for tt in tags:
    place(sfx, pop(1200, 500), tt, 0.6)
# end card: the voiced sonic logo
SONIC = os.path.join(HERE, "..", "..", "brand", "assets", "audio", "sonic-logo-voice.wav")
with wave.open(SONIC) as w:
    sl = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(float).reshape(-1, 2).mean(axis=1) / 32768
place(sfx, sl, END_T0, 1.1)

# ---------------------------------------------------------------- voice + mix
with wave.open(os.path.join(HERE, "out", "voice.wav")) as w:
    vsr = w.getframerate()
    v = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(float) / 32768
v = np.interp(np.arange(int(len(v) * SR / vsr)) / SR, np.arange(len(v)) / vsr, v)
voice = np.zeros(N)
voice[: min(N, len(v))] = fft_filter(v, lo=80)[:N]
voice /= np.abs(voice).max() + 1e-9

env = np.convolve(np.abs(voice), np.ones(int(0.12 * SR)) / int(0.12 * SR), mode="same")
env = np.clip(env / (env.max() + 1e-9) * 4, 0, 1)
bed = 1 - 0.7 * env
duck = 1 - np.clip(np.convolve(np.abs(drums), np.ones(int(0.05 * SR)) / int(0.05 * SR), mode="same") * 0.6, 0, 0.35)
Lm = (L * duck + music * 0.75) * 0.8 * bed + sfx * 0.85 * (1 - 0.3 * env) + voice * 0.95
Rm = (R * duck + music * 0.75) * 0.8 * bed + sfx * 0.85 * (1 - 0.3 * env) + voice * 0.95
n_out = int(DUR * SR)
mix = np.stack([Lm[:n_out], Rm[:n_out]], axis=1)
fade = int(0.4 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix /= np.abs(mix).max() / 0.89
out = os.path.join(HERE, "out", "soundtrack.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"wrote {out} ({DUR:.1f}s)")
