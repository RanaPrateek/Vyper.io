# Population: 1 — city-builder post

A 40-second vertical (1080×1920, 30 fps) post in the "**Day 0: this city has one resident**" format:
a city that viewers build through follows, comments and votes. The whole thing is a procedural Three.js scene
plus HTML overlays, rendered frame by frame. No stock footage or AI video.

## Shot list

| Time | Label / title | Visual |
|---|---|---|
| 0.0–2.7 | DAY 0 · POPULATION: 1 | Highway into town, green "YOUR CITY / POPULATION 1" sign |
| 2.7–5.8 | DAY 0 · TOTALLY EMPTY | Drone glide over the empty road grid |
| 5.8–11.6 | THE PLAN · BUILT BY YOU | Aerial orbit while towers, mid-rises and houses grow out of the plots |
| 11.6–15.3 | RULE 1 · FOLLOW = CITIZEN | Sign close-up, population counts up to 582 |
| 15.3–19.6 | RULE 2 · 1 COMMENT = 1 HOUSE | A house pops in, then a close-up of the "@YOUR_NAME" nameplate |
| 19.6–26.6 | RULE 3 · TOP COMMENT RULES | Sunset street, "TOP COMMENT" card with a climbing like count |
| 26.6–33.3 | VOTE NOW · BUILD WHAT FIRST? | Top-down plots A/B/C with HOSPITAL / STADIUM / GIANT MALL tags |
| 33.3–37.0 | DAY 1 · RESULTS NEXT EPISODE | Back at the sign, A/B/C options pop in |
| 37.0–40.0 | End card | "Follow to move in" + your handle |

Burned-in karaoke captions (white with a black outline, active word in orange) follow the voiceover below.

## Voiceover script (timed)

```
0.0  This city has one resident.
2.0  Me.
2.8  No neighbours, no shops, just empty roads.
5.9  But here's the plan.
7.0  Every video, this city grows, built by real people.
10.9 You.
11.7 Rule one: follow, and you're officially a citizen.
15.3 Rule two: comment, and I'll build you a house, with your name on it.
19.7 Rule three: the most liked comment rules the city.
23.0 Whatever it says, I build. No matter what.
26.7 So, what do we build first?
28.7 A, a hospital. B, a stadium. Or C, a giant mall.
33.3 Vote in the comments.
34.7 Results next episode.
```

## Render

Needs Node 18+, ffmpeg and Playwright with Chromium.

```bash
npm install
node render.mjs                                   # -> out/post.mp4
node render.mjs --stills 1.3,9,24                 # quick PNG checks
node render.mjs --handle @yourname --name @JANE --city "NEW TOWN" --pop 582
node render.mjs --audio voiceover.mp3             # mux in a voiceover / music bed
```

To preview it live, serve the folder with any static server (for example `npx serve .`) and open `index.html`.
Query params `?handle=&name=&city=&pop=` work there too.

Edit `SHOTS` (camera moves, titles) and `CAPTIONS` (word timings) in `main.js` to change the story.
If you record your own voiceover, adjust the word start times in `CAPTIONS` to match it.
