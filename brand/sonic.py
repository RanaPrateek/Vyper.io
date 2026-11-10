"""Sonic identity: sonic logo, voiced sonic logo, theme loop and an SFX pack.

    python3 brand/sonic.py      -> brand/assets/audio/*.wav and *.mp3

Built from the same synth instruments as the episode soundtrack (city-post/sfxlib.py), so every
episode and every brand asset sounds like one world. Nothing is sampled.
"""
import os
import subprocess
import sys
import wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "city-post"))
from sfxlib import (SR, chime, clap, fft_filter, hat, impact, kick, pad_chord, pluck, pop,  # noqa: E402
                    riser, thunk, tick, whoosh, bass_note, t_axis)

OUT = os.path.join(HERE, "assets", "audio")
os.makedirs(OUT, exist_ok=True)


def place(dst, sig, t0, gain=1.0):
    i = int(round(t0 * SR))
    j = min(len(dst), i + len(sig))
    if 0 <= i < len(dst):
        dst[i:j] += sig[: j - i] * gain


def save(name, x, peak_db=-1.0, mp3=True):
    x = np.asarray(x, dtype=float)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)
    path = os.path.join(OUT, name + ".wav")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())
    if mp3:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-codec:a", "libmp3lame", "-b:a", "192k",
                        os.path.join(OUT, name + ".mp3")], check=True)
    print(f"wrote brand/assets/audio/{name}.wav ({len(x) / SR:.2f}s)")


def load_voice(path):
    with wave.open(path) as w:
        sr = w.getframerate()
        v = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(float) / 32768
    v = np.interp(np.arange(int(len(v) * SR / sr)) / SR, np.arange(len(v)) / sr, v)
    env = np.convolve(np.abs(v), np.ones(int(0.02 * SR)) / int(0.02 * SR), mode="same")
    on = np.where(env > env.max() * 0.05)[0]
    v = v[max(0, on[0] - int(0.01 * SR)): on[-1] + int(0.08 * SR)]
    env = env[max(0, on[0] - int(0.01 * SR)): on[-1] + int(0.08 * SR)]
    # onset of the last word = end of the longest silent gap inside the clip
    quiet = env < env.max() * 0.06
    best, run, start, last_onset = 0, 0, 0, len(v) * 0.6
    for i, q in enumerate(quiet):
        if q:
            if run == 0:
                start = i
            run += 1
        else:
            if run > best and start > 0.1 * SR:
                best, last_onset = run, i
            run = 0
    return fft_filter(v, lo=80), last_onset / SR


# ---------------------------------------------------------------- sonic logo (instrumental)
def sonic_logo(pop_at=0.62, ticks_gain=1.0):
    dur = pop_at + 2.4
    L, R = np.zeros(int(dur * SR)), np.zeros(int(dur * SR))
    # the counter going up: ticks accelerate, plucks climb C-E-G-B-C
    tick_times = [pop_at - d for d in (0.62, 0.42, 0.27, 0.16, 0.08)]
    for k, (tt, m) in enumerate(zip(tick_times, (72, 76, 79, 83, 84))):
        g = (0.45 + 0.12 * k) * ticks_gain
        place(L, tick(), tt, 0.5 * g)
        place(R, tick(), tt, 0.5 * g)
        place(L, pluck(m, 0.3), tt, 0.38 * g)
        place(R, pluck(m, 0.3), tt + 0.006, 0.38 * g)
    # the arrival: pop + bell chord + soft C-major swell
    for ch, off in ((L, 0), (R, 0.004)):
        place(ch, pop(1500, 650, 0.12), pop_at + off, 0.8)
        place(ch, chime(84, 2.2), pop_at + off, 0.55)
        place(ch, chime(91, 2.0), pop_at + 0.07 + off, 0.3)
        place(ch, chime(88, 2.0), pop_at + 0.035 + off, 0.25)
    pad = pad_chord([48, 55, 60, 64, 67], 2.3)
    pad = fft_filter(pad, hi=2200) * np.linspace(1, 0, len(pad)) ** 1.5
    place(L, pad, pop_at, 0.55)
    place(R, np.roll(pad, int(0.011 * SR)), pop_at, 0.55)
    place(L, kick(), pop_at, 0.45)
    place(R, kick(), pop_at, 0.45)
    fade = int(0.3 * SR)
    for ch in (L, R):
        ch[-fade:] *= np.linspace(1, 0, fade)
    return np.stack([L, R], axis=1)


# ---------------------------------------------------------------- theme loop (8 s, seamless)
def theme_loop():
    beat, bar = 0.5, 2.0
    prog = [([60, 64, 67, 72], 36), ([59, 62, 67, 71], 43), ([57, 60, 64, 69], 45), ([57, 60, 65, 69], 41)]
    arp = [0, 1, 2, 3, 2, 1, 2, 3]
    total = 24.0  # render three cycles, keep the middle one so every tail wraps naturally
    L, R = np.zeros(int(total * SR)), np.zeros(int(total * SR))
    for b in range(12):
        bt = b * bar
        notes, root = prog[b % 4]
        pad = fft_filter(pad_chord(notes, bar + 0.5), hi=4200)
        place(L, pad, bt, 0.5)
        place(R, np.roll(pad, int(0.011 * SR)), bt, 0.5)
        for s in range(8):
            st = bt + s * beat / 2
            place(L, pluck(notes[arp[s]] + 12), st, 0.3)
            place(R, pluck(notes[arp[s]] + 12), st + 0.004, 0.3)
            bn = bass_note(root + (12 if s in (3, 7) else 0), beat / 2 * 0.9)
            place(L, bn, st, 0.4)
            place(R, bn, st, 0.4)
            if s % 2 == 0:
                place(L, kick(), st, 0.7)
                place(R, kick(), st, 0.7)
            if s in (2, 6):
                place(L, clap(), st, 0.33)
                place(R, clap(), st, 0.33)
            place(L, hat(s % 2 == 1), st, 0.22 if s % 2 else 0.13)
            place(R, hat(s % 2 == 1), st, 0.28 if s % 2 else 0.16)
    i0, i1 = int(8 * SR), int(16 * SR)
    return np.stack([L[i0:i1], R[i0:i1]], axis=1)


if __name__ == "__main__":
    save("sonic-logo", sonic_logo())

    raw = os.path.join(OUT, "voice-tag-raw.wav")
    if os.path.exists(raw):
        voice, you_at = load_voice(raw)
        v_start = 0.12
        pop_at = max(0.62, v_start + you_at)
        mix = sonic_logo(pop_at=pop_at, ticks_gain=0.55)
        n = max(len(mix), int((v_start + len(voice) / SR) * SR) + 1)
        mix = np.pad(mix, ((0, n - len(mix)), (0, 0)))
        vbuf = np.zeros(n)
        place(vbuf, voice / (np.abs(voice).max() + 1e-9), v_start)
        mix[:, 0] = mix[:, 0] / (np.abs(mix).max() + 1e-9) * 0.55 + vbuf
        mix[:, 1] = mix[:, 1] / (np.abs(mix).max() + 1e-9) * 0.55 + vbuf
        save("sonic-logo-voice", mix)
        print(f"  voice 'you' lands at {pop_at:.2f}s, on the pop")

    save("theme-loop", theme_loop(), peak_db=-1.5)

    sfx = {
        "sfx-tick": tick(), "sfx-pop": pop(), "sfx-pop-high": pop(1400, 700, 0.12),
        "sfx-whoosh": whoosh(), "sfx-riser": riser(1.2), "sfx-impact": impact(),
        "sfx-build-thunk": thunk(), "sfx-chime": chime(76), "sfx-kick": kick(), "sfx-clap": clap(),
    }
    for name, x in sfx.items():
        save(name, x, peak_db=-3.0, mp3=False)
