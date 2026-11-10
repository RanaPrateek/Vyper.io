"""Original soundtrack + sound effects for the city post, synthesised from scratch with numpy.

    python3 audio.py                -> out/soundtrack.wav (40 s, 44.1 kHz stereo)

Cue times mirror SHOTS / CAPTIONS in main.js. Nothing here is sampled: every sound is generated.
"""
import os
import wave
import numpy as np

from sfxlib import *  # noqa: F401,F403  (SR, rng, instruments)
from sfxlib import SR, rng
DUR = 40.0
N = int(SR * DUR)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "soundtrack.wav")

# ---------------------------------------------------------------- cue sheet (seconds)
CUTS = [2.7, 5.8, 11.6, 15.3, 18.0, 19.6, 26.6, 33.3, 37.0]
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT


# ---------------------------------------------------------------- helpers
def buf():
    return np.zeros(N)


# ---------------------------------------------------------------- score
# I–V–vi–IV in C, one chord per bar (2 s). Voicings in the mid register.
PROG = [
    ([60, 64, 67, 72], 36),  # C
    ([59, 62, 67, 71], 43),  # G
    ([57, 60, 64, 69], 45),  # Am
    ([57, 60, 65, 69], 41),  # F
]
ARP = [0, 1, 2, 3, 2, 1, 2, 3]

pad_l, pad_r = buf(), buf()
keys, bass, drums_k, drums_c, drums_h = buf(), buf(), buf(), buf(), buf()
sfx = buf()


def section(t0, t1):
    """Intensity of each part at time t: returns dict of on/off flags."""
    return t0, t1


SECTIONS = [  # (start, end, pad_cut, arp, bass, kick, clap, hats)
    (0.0, 5.8, 1400, "sparse", False, None, False, None),
    (5.8, 11.6, 5000, "full", True, "four", True, "8th"),
    (11.6, 19.6, 4200, "full", True, "four", True, "8th"),
    (19.6, 26.6, 1800, "sparse", True, "half", False, None),
    (26.6, 33.3, 5200, "full", True, "four", True, "16th"),
    (33.3, 36.6, 4600, "full", True, "four", True, "8th"),
]

for (s0, s1, cut, arp, has_bass, kick_mode, has_clap, hats) in SECTIONS:
    seg_l, seg_r = buf(), buf()
    bar = int(np.floor(s0 / BAR))
    while bar * BAR < s1:
        bt = bar * BAR
        notes, root = PROG[bar % 4]
        chord = pad_chord(notes, BAR + 0.5)
        lo, hi = max(s0, bt), min(s1, bt + BAR)
        if hi > lo:
            c = chord.copy()
            a, b = int((lo - bt) * SR), int((hi - bt) * SR)
            c[:a] = 0
            c[b:] *= np.linspace(1, 0, len(c) - b) if b < len(c) else 1
            place(seg_l, c, bt)
            place(seg_r, np.roll(c, int(0.011 * SR)), bt)
        for step in range(8 if arp == "full" else 4):
            st = bt + step * (BAR / (8 if arp == "full" else 4))
            if s0 <= st < s1:
                idx = ARP[step % 8] if arp == "full" else [0, 2, 3, 1][step]
                place(keys, pluck(notes[idx] + 12), st, 0.55 if arp == "full" else 0.45)
        for b8 in range(8):
            st = bt + b8 * BEAT / 2
            if not (s0 <= st < s1):
                continue
            if has_bass:
                if kick_mode == "half":
                    if b8 in (0, 4):
                        place(bass, bass_note(root, BEAT * 1.8), st, 0.4)
                else:
                    place(bass, bass_note(root + (12 if b8 in (3, 7) else 0), BEAT / 2 * 0.9), st, 0.8)
            if kick_mode == "four" and b8 % 2 == 0:
                place(drums_k, kick(), st)
            if kick_mode == "half" and b8 == 0:
                place(drums_k, kick(), st, 0.8)
            if has_clap and b8 in (2, 6):
                place(drums_c, clap(), st)
            if hats == "8th":
                place(drums_h, hat(b8 % 2 == 1), st, 0.5 if b8 % 2 else 0.3)
            if hats == "16th":
                place(drums_h, hat(b8 % 2 == 1), st, 0.5 if b8 % 2 else 0.3)
                place(drums_h, hat(), st + BEAT / 4, 0.22)
        bar += 1
    pad_l += fft_filter(seg_l, hi=cut)
    pad_r += fft_filter(seg_r, hi=cut)

# outro: held C chord under the end card
outro = pad_chord([48, 55, 60, 64, 67], 3.4)
outro *= np.linspace(1, 0, len(outro)) ** 0.6
place(pad_l, fft_filter(outro, hi=2600), 36.6, 1.1)
place(pad_r, fft_filter(np.roll(outro, int(0.011 * SR)), hi=2600), 36.6, 1.1)

# ---------------------------------------------------------------- sound effects
for c in CUTS:
    place(sfx, whoosh(), c - 0.32, 0.55)
place(sfx, riser(1.2), 4.6, 0.55)          # build into "here's the plan"
place(sfx, impact(), 5.8, 0.75)
place(sfx, riser(1.0), 25.6, 0.45)         # build into the vote
place(sfx, impact(), 26.6, 0.55)
place(sfx, impact(), 37.0, 0.45)

# buildings rising: a rumble bed plus staggered thunks
rumble_t = t_axis(4.0)
rumble = fft_filter(noise(len(rumble_t)), hi=180) * np.sin(np.pi * rumble_t / 4.0) ** 1.5
place(sfx, rumble, 7.0, 1.4)
for k in range(16):
    tt = 7.25 + k * 0.2 + rng.random() * 0.08
    place(sfx, thunk(), tt, 0.5 * (1 - k / 22))

# population counter (rule 1): ticks speed up then ease out, matching easeOut(…/2.0)
prev = 0
for i in range(1, 2000):
    tt = 12.5 + i / 1000 * 2.0
    k = 1 - (1 - i / 1000) ** 3
    val = int(1 + 581 * k)
    if val // 12 != prev // 12 and tt < 14.5:
        place(sfx, tick(), tt, 0.35)
    prev = val
place(sfx, pop(1400, 700, 0.12), 14.5, 0.5)

place(sfx, pop(700, 220, 0.16), 15.9, 0.9)   # house pops in
place(sfx, pop(1100, 400), 22.85, 0.8)       # comment card
for i, tt in enumerate((27.0, 27.12, 27.24)):  # vote plots
    place(sfx, pop(800 + i * 150, 300), tt, 0.55)
for tt in (29.15, 30.67, 32.33):             # vote tags
    place(sfx, pop(1200, 500), tt, 0.7)
for i, tt in enumerate((33.45, 33.85, 34.25)):  # results options
    place(sfx, pop(900 + i * 200, 350), tt, 0.7)
place(sfx, chime(76), 37.05, 0.35)
place(sfx, chime(83), 37.25, 0.25)

# likes climbing on the comment card: soft ticks
for tt in np.arange(23.2, 26.4, 0.16):
    place(sfx, tick(), tt, 0.12)

# ---------------------------------------------------------------- mix
music_l = pad_l * 0.55 + keys * 0.32 + bass * 0.42 + drums_k * 0.75 + drums_c * 0.35
music_r = pad_r * 0.55 + keys * 0.32 + bass * 0.42 + drums_k * 0.75 + drums_c * 0.35
hat_pan = drums_h * 0.28
music_l += hat_pan * 0.8
music_r += hat_pan * 1.0

# gentle sidechain-style duck of pads/keys on each kick
duck = np.ones(N)
kick_env = np.abs(drums_k)
kick_env = np.convolve(kick_env, np.ones(int(0.05 * SR)) / int(0.05 * SR), mode="same")
duck -= np.clip(kick_env * 0.6, 0, 0.35)
music_l *= duck
music_r *= duck

# ---------------------------------------------------------------- voiceover (from voice.mjs)
VOICE = os.path.join(os.path.dirname(OUT), "voice.wav")
voice = buf()
if os.path.exists(VOICE):
    with wave.open(VOICE) as w:
        vsr = w.getframerate()
        v = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(float) / 32768
        if w.getnchannels() == 2:
            v = v.reshape(-1, 2).mean(axis=1)
    v = np.interp(np.arange(int(len(v) * SR / vsr)) / SR, np.arange(len(v)) / vsr, v)  # resample
    v = fft_filter(v, lo=80)                     # clear rumble under the voice
    voice[: min(N, len(v))] = v[:N]
    voice /= np.max(np.abs(voice)) + 1e-9
    print("mixed voiceover from", VOICE)

# duck music and effects under speech: smoothed voice envelope -> up to ~10 dB reduction
venv = np.abs(voice)
w = int(0.12 * SR)
venv = np.convolve(venv, np.ones(w) / w, mode="same")
venv = np.clip(venv / (venv.max() + 1e-9) * 4, 0, 1)
bed_gain = 1 - 0.68 * venv                       # 0.32 ~= -10 dB
sfx_gain = 1 - 0.35 * venv

L = music_l * 0.8 * bed_gain + sfx * 0.9 * sfx_gain + voice * 0.95
R = music_r * 0.8 * bed_gain + sfx * 0.9 * sfx_gain + voice * 0.95

# fades
fade_in = int(0.03 * SR)
for ch in (L, R):
    ch[:fade_in] *= np.linspace(0, 1, fade_in)
    ch[-int(0.4 * SR):] *= np.linspace(1, 0, int(0.4 * SR))

mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.2) / np.tanh(1.2)       # soft clip
mix /= np.max(np.abs(mix)) / 0.89              # peak about -1 dBFS

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", OUT, f"{DUR:.1f}s")
