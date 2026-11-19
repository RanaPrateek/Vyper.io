"""Caption timing from the actual narration: runs Whisper (faster-whisper, small.en) over each beat of
<ep>/out/voice.wav, maps its word timestamps onto the on-screen text, and writes <ep>/timeline.json.

    HF_HUB_DISABLE_XET=1 python3 tools/align.py ep02 [--endcard 3.6]

Mapping: Whisper's spelling can differ from the script ("Casparita", "73%"), so each on-screen word
gets the timestamp of the Whisper word at the same relative character position within the beat.
"""
import json
import os
import sys
import wave

import numpy as np
from faster_whisper import WhisperModel

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
EP = os.path.join(ROOT, sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "ep02")
ENDCARD = float(sys.argv[sys.argv.index("--endcard") + 1]) if "--endcard" in sys.argv else 3.6

beats = json.load(open(os.path.join(EP, "out", "beats.json")))
with wave.open(os.path.join(EP, "out", "voice.wav")) as w:
    sr = w.getframerate()
    audio = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32768
a16 = np.interp(np.arange(int(len(audio) * 16000 / sr)) / 16000, np.arange(len(audio)) / sr, audio).astype(np.float32)

model = WhisperModel("small.en", compute_type="int8")
out = []
for b in beats["beats"]:
    s, e = b["start"], b["end"]
    seg = a16[int(max(0, s - 0.05) * 16000): int((e + 0.1) * 16000)]
    res, _ = model.transcribe(seg, word_timestamps=True, initial_prompt=b["say"], vad_filter=False)
    ww = [(x.word.strip(), x.start + max(0, s - 0.05)) for r in res for x in (r.words or []) if x.word.strip()]
    show = b["show"].split()
    if not ww:  # fall back: spread words evenly
        ww = [(x, s + (e - s) * i / len(show)) for i, x in enumerate(show)]
    # relative char positions
    def starts(words):
        pos, acc = [], 0
        total = sum(len(x) + 1 for x in words)
        for x in words:
            pos.append(acc / total)
            acc += len(x) + 1
        return pos
    wpos, spos = starts([x for x, _ in ww]), starts(show)
    words = []
    for word, p in zip(show, spos):
        k = max(i for i, q in enumerate(wpos) if q <= p + 1e-6)
        # interpolate inside the whisper word if the script splits it differently
        t0 = ww[k][1]
        t1 = ww[k + 1][1] if k + 1 < len(ww) else e
        span = (wpos[k + 1] if k + 1 < len(wpos) else 1.0) - wpos[k]
        t = t0 + (t1 - t0) * ((p - wpos[k]) / span if span > 0 else 0)
        words.append([word, round(max(s, t), 3)])
    # keep times monotonic
    for i in range(1, len(words)):
        words[i][1] = max(words[i][1], words[i - 1][1] + 0.05)
    heard = " ".join(x for x, _ in ww)
    print(f"{b['id']:<10} {s:6.2f}-{e:6.2f}  heard: {heard}")
    out.append({"id": b["id"], "start": s, "end": e, "words": words})

timeline = {"duration": round(beats["voice_end"] + ENDCARD, 2), "voice_end": beats["voice_end"], "beats": out}
json.dump(timeline, open(os.path.join(EP, "timeline.json"), "w"), indent=1)
print("duration", timeline["duration"], "-> timeline.json")
