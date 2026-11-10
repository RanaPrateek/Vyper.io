"""Shared synth instruments and sound effects for the series (numpy only).

Used by city-post/audio.py (episode soundtrack) and brand/sonic.py (sonic logo, theme, SFX pack).
"""
import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def place(dst, sig, t0, gain=1.0):
    i = int(t0 * SR)
    if i >= len(dst):
        return
    j = min(len(dst), i + len(sig))
    dst[i:j] += sig[: j - i] * gain


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def fft_filter(x, lo=None, hi=None, slope=0.15):
    """Smooth band filter in the frequency domain. lo/hi in Hz."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / (1 + (f / hi) ** (2 / slope * 0.25))
    if lo:
        g *= 1 - 1 / (1 + (f / lo) ** (2 / slope * 0.25))
    return np.fft.irfft(X * g, len(x))


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = max(1, min(na, n)); e[:na] = np.linspace(0, 1, na)
    nd = max(1, min(nd, n - na)); e[na:na + nd] = np.linspace(1, s, nd)
    nr = max(1, min(nr, n)); e[-nr:] *= np.linspace(1, 0, nr)
    return e


def saw(freq, t):
    return 2 * ((freq * t) % 1.0) - 1


def noise(n):
    return rng.standard_normal(n)


# ---------------------------------------------------------------- instruments
def pad_chord(notes, dur, detune=0.12):
    t = t_axis(dur)
    s = np.zeros_like(t)
    for m in notes:
        for d in (-detune, 0, detune):
            s += saw(midi(m + d), t + rng.random())
    return s / (len(notes) * 3) * env_adsr(len(t), a=0.35, d=0.4, s=0.85, r=0.5)


def pluck(m, dur=0.45):
    t = t_axis(dur)
    f = midi(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return s * np.exp(-t * 9) * np.minimum(1, t * 400)


def bass_note(m, dur):
    t = t_axis(dur)
    f = midi(m)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    s = np.tanh(1.6 * s)
    return s * env_adsr(len(t), a=0.005, d=0.08, s=0.6, r=0.06)


def kick():
    t = t_axis(0.35)
    f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) + 0.25 * noise(len(t)) * np.exp(-t * 120)


def clap():
    t = t_axis(0.25)
    n = fft_filter(noise(len(t)), lo=900, hi=5000)
    e = np.exp(-t * 22)
    for k in (0.0, 0.012, 0.024):  # triple-hit clap
        e += 0.5 * np.exp(-np.maximum(t - k, 0) * 120) * (t >= k)
    return n * e * 0.6 + 0.3 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)


HAT_SRC = fft_filter(noise(int(0.08 * SR)), lo=7000)


def hat(open_=False):
    t = t_axis(0.08)
    return HAT_SRC * np.exp(-t * (25 if open_ else 70))


def whoosh(dur=0.55):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = noise(n)
    lo = fft_filter(x, hi=900)
    hi = fft_filter(x, lo=2500, hi=9000)
    k = t / dur
    mix = lo * (1 - k) + hi * k  # brightens as it passes
    e = np.sin(np.pi * np.clip(k, 0, 1)) ** 2
    return mix * e * 0.9


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    k = t / dur
    x = noise(n)
    bright = fft_filter(x, lo=1500) * k ** 2 + fft_filter(x, hi=1500) * (1 - k) * 0.5
    tone = np.sin(2 * np.pi * np.cumsum(220 + 660 * k ** 2) / SR) * 0.25
    return (bright * 0.6 + tone) * k ** 1.5


def impact():
    t = t_axis(1.8)
    f = 35 + 60 * np.exp(-t * 12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.8)
    crack = fft_filter(noise(len(t)), lo=200, hi=6000) * np.exp(-t * 7) * 0.5
    return boom + crack


def pop(f0=900, f1=320, dur=0.11):
    t = t_axis(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 45)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32) * np.minimum(1, t * 2000)


def thunk():
    t = t_axis(0.3)
    f = 50 + 70 * np.exp(-t * 25)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    grit = fft_filter(noise(len(t)), lo=150, hi=1500) * np.exp(-t * 30) * 0.35
    return body + grit


def tick():
    t = t_axis(0.025)
    return np.sin(2 * np.pi * 2300 * t) * np.exp(-t * 260)


def chime(m=76, dur=2.6):
    t = t_axis(dur)
    f = midi(m)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dcy)
            for r, a, dcy in ((1, 1, 1.6), (2.0, 0.4, 2.5), (2.76, 0.25, 3.5), (5.4, 0.1, 6)))
    return s * np.minimum(1, t * 600)
