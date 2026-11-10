# Population: You — brand kit

A city built by its followers. Open **`index.html`** for the full brand guide: name, logo, colour, type, sound, voice and tone, the episode formula and the platform kit. Images and audio are embedded, so it works offline.

## Assets

| Path | What |
|---|---|
| `assets/logo.svg`, `logo-board.svg` | Primary sign logo (with and without posts), with text as vector outlines |
| `assets/avatar.svg`, `png/avatar.png` | Profile picture, safe for circle crops |
| `assets/wordmark.svg`, `wordmark-white.svg` | One-line wordmark for light and dark backgrounds |
| `assets/png/banner-youtube.png`, `banner-x.png` | Channel banner (2560×1440) and X/LinkedIn header (1500×500) |
| `assets/png/cover-ep1.png` | Episode cover / thumbnail (1080×1920) |
| `assets/audio/sonic-logo(.wav/.mp3)` | 3 s sonic logo: counter ticks up, then pop and chime |
| `assets/audio/sonic-logo-voice(.wav/.mp3)` | The same logo with the narrator saying "Population: you" |
| `assets/audio/theme-loop(.wav/.mp3)` | 8 s seamless theme loop, 120 BPM |
| `assets/audio/sfx-*.wav` | Sound-effects pack: whoosh, pop, tick, build thunk, riser, impact, chime, kick, clap |

## Rebuild

```bash
python3 brand/build.py                 # vector logos  (pip install fonttools uharfbuzz)
python3 brand/build.py --word "YOU"    #   the big word on the sign is configurable
node brand/voice_tag.mjs               # narrator voice tag (Kokoro; needs kokoro-js from city-post)
python3 brand/sonic.py                 # sonic logo, theme loop, SFX pack
node city-post/render.mjs --stills 9.4,14.2 --clean 1   # clean scene frames for covers
node brand/render.mjs --ep 2 --day 1 --title "POPULATION: 214"   # PNG exports + new episode cover
python3 brand/guide.py                 # brand guide (index.html)
```

Everything is generated: no stock, samples or licensed music. The fonts are Inter (SIL Open Font License) and the voice is Kokoro-82M (Apache-2.0). Before you launch, check that the name, handles and domain are available and run a trademark search.
