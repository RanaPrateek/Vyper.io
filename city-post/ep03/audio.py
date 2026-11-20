"""Episode 3 soundtrack: music bed + effects keyed to timeline.json (same cue rules as ep03/main.js),
narration from out/voice.wav (music ducked under it), and the brand sonic logo on the end card.

    python3 ep03/audio.py        -> ep03/out/soundtrack.wav
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


# ---------------------------------------------------------------- cues (mirror ep03/main.js)
ORDER = ["hook", "rosie", "tamara", "houses", "potato", "duck", "shoe", "ostrich", "nugget", "kacee", "hill", "vote",
         "pigeon", "milestone", "next", "end"]
CARDS = {"rosie": 1, "tamara": 1, "potato": 1, "duck": 1, "shoe": 1, "ostrich": 1, "nugget": 1, "kacee": 1, "pigeon": 1}
shot_t0 = {b: (0 if i == 0 else BEAT[b]["start"] - 0.12) for i, b in enumerate(ORDER)}
END_T0 = TL["voice_end"] + 0.15
today = W("hook", lambda w: w.startswith("Today"), 2.8)
ext_t = W("tamara", lambda w: w.startswith("Done"), 3.5)
houses_pop = BEAT["houses"]["start"] + 0.8
hill_up = BEAT["hill"]["start"] + 0.3
fire = W("vote", lambda w: w.startswith("Fire"), 1)
skate = W("vote", lambda w: w.startswith("Skate"), 2.5)
pct = [t for w, t in BEAT["vote"]["words"] if "%" in w]
mall_win = pct[-1] if pct else BEAT["vote"]["end"] - 0.6
mall_rise = mall_win + 0.35
kevin = W("pigeon", lambda w: w.startswith("Kevin"), 1.5)
tags = [W("next", lambda w, L=L: w.startswith(L + ","), 1 + i) for i, L in enumerate("ABC")]
STATE = json.load(open(os.path.join(HERE, "..", "city", "state.json")))
new = [c for c in STATE["citizens"] if c["since_episode"] == CFG["episode"] and c["house"] != "villa"]
dists = sorted(((c["x"]) ** 2 + (c["z"] - 400) ** 2) ** 0.5 for c in new)
dmax = max(dists)
house_pops = [houses_pop + d / dmax * 3.0 for d in dists]
n_villas = sum(1 for c in STATE["citizens"] if c["house"] == "villa")
villa_pops = [hill_up + 0.9 + i / n_villas * 2.6 for i in range(n_villas)]
stadium, hospital = fire, skate
pigeon_in = kevin
n_houses = 0
reached = CFG.get("milestone_state") == "reached"

# ---------------------------------------------------------------- music: I–V–vi–IV, 120 BPM
PROG = [([60, 64, 67, 72], 36), ([59, 62, 67, 71], 43), ([57, 60, 64, 69], 45), ([57, 60, 65, 69], 41)]
ARP = [0, 1, 2, 3, 2, 1, 2, 3]
beat_s, bar_s = 0.5, 2.0
L, R = np.zeros(N), np.zeros(N)
drums, keys, bass = np.zeros(N), np.zeros(N), np.zeros(N)


def section(t):
    if t < BEAT["rosie"]["start"] - 0.12:
        return "intro"
    if mall_win - 2.2 <= t < mall_win:
        return "break"          # hold the breath before the winner
    if BEAT["pigeon"]["start"] - 0.12 <= t < BEAT["milestone"]["start"] - 0.12:
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
    place(sfx, whoosh(), shot_t0[b] - 0.3, 0.45)
prev = CFG["previous_followers"]; last = prev
for i in range(1, 600):
    tt = today + i / 600 * 1.2
    v = round(prev + (CFG["followers"] - prev) * (1 - (1 - i / 600) ** 3))
    if v != last and (v - prev) % 2 == 0:
        place(sfx, tick(), tt, 0.35)
    last = v
place(sfx, pop(1400, 700, 0.12), today + 1.2, 0.55)
place(sfx, pop(700, 260, 0.16), ext_t, 0.8)
for i, tt in enumerate(house_pops[::3]):     # a crackle of pops across the neighbourhood
    place(sfx, pop(650 + (i % 9) * 60, 250 + (i % 5) * 30, 0.1), tt, 0.32)
for b, n in CARDS.items():
    for k in range(n):
        place(sfx, pop(1100, 420), shot_t0[b] + 0.3 + 0.5 * k, 0.45)
rt = t_axis(1.2)
place(sfx, fft_filter(noise(len(rt)), hi=160) * np.sin(np.pi * rt / 1.2), hill_up, 1.0)
for tt in villa_pops[::2]:
    place(sfx, pop(520, 220, 0.12), tt, 0.35)
place(sfx, pop(900, 350), fire, 0.6)
place(sfx, pop(1000, 380), skate, 0.6)
place(sfx, riser(1.6), mall_win - 1.6, 0.45)
place(sfx, impact(), mall_win, 0.6)
place(sfx, chime(84, 2.0), mall_win + 0.2, 0.3)
rt = t_axis(1.8)
place(sfx, fft_filter(noise(len(rt)), hi=180) * np.sin(np.pi * rt / 1.8), mall_rise, 1.2)
for k in range(7):
    place(sfx, thunk(), mall_rise + k * 0.24, 0.45)
place(sfx, pop(1500, 700, 0.12), mall_rise + 1.6, 0.5)
ct = t_axis(0.55)
coo = np.sin(2 * np.pi * np.cumsum(300 + 40 * np.sin(2 * np.pi * 9 * ct) - 80 * ct) / SR) * np.sin(np.pi * ct / 0.55) ** 2
coo = fft_filter(coo + 0.3 * np.sin(2 * np.pi * np.cumsum(600 + 80 * np.sin(2 * np.pi * 9 * ct)) / SR) * np.sin(np.pi * ct / 0.55) ** 2, hi=1800)
place(sfx, pop(1300, 600, 0.12), kevin, 0.6)
place(sfx, coo, kevin + 0.35, 0.35)
ms = shot_t0["milestone"]
if reached:
    place(sfx, impact(), ms + 0.4, 0.45)
    for k, m in enumerate((72, 76, 79, 84)):
        place(sfx, chime(m, 1.8), ms + 0.45 + k * 0.09, 0.22)
else:
    place(sfx, riser(1.5) * 0.6, ms + 0.5, 0.35)
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
