#!/usr/bin/env bash
# Build an episode end to end: narration -> caption timing -> soundtrack -> video.
#   tools/build_episode.sh ep02            (after editing ep02/config.json or ep02/script.json)
# Needs kokoro-js (KOKORO_DIR=... if installed elsewhere), faster-whisper, ffmpeg, Playwright.
set -euo pipefail
EP=${1:-ep02}
cd "$(dirname "$0")/.."
export NODE_USE_ENV_PROXY=${NODE_USE_ENV_PROXY:-1} HF_HUB_DISABLE_XET=${HF_HUB_DISABLE_XET:-1}
[ -f /root/.ccr/ca-bundle.crt ] && export NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt
node tools/beats_voice.mjs "$EP" 2>&1 | grep -v -i "warning\|trace-warnings" | awk 'length($0)<300'
python3 tools/align.py "$EP" 2>&1 | grep -v -i warning
python3 "$EP/audio.py"
node render.mjs --page "$EP/index.html" --audio "$EP/out/soundtrack.wav" --out "$EP/out/episode.mp4" | grep -E "wrote|frame [0-9]*0/" | tail -3
