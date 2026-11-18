# Population: You: series log

> The show's memory. Every new session starts by reading this file, and every episode ends by updating it.

**Account:** TikTok `@population.you` (backups: `@populationyou`, `@population.you.city`)
**Roles:** Claude makes the show: story, 3D city, script, voice, sound, edit, captions. The account holder uploads with the *AI-generated* label on, reads the comments, and sends the results back.
**Tagline:** A city built by its followers.
**Narrator:** Kokoro-82M `af_heart`, speed 1.1. Brand guide: `brand/index.html`.

## Rules of the city (as told to viewers)
1. **Follow:** you're a citizen. The population sign shows the real follower count.
2. **Comment:** you get a house with your name on it.
3. **Top comment rules:** the most-liked comment gets built.
4. **Vote:** each episode ends with an A / B / C choice. Most comments wins.

**House rules (not said on air):**
- The top comment is built unless it's offensive, hateful, sexual, dangerous or targets a person. If it is, the next most-liked comment wins instead.
- Usernames that aren't suitable to show on a house are skipped.
- Only public usernames go on houses: no real names, faces or other personal details.

## Schedule (UK time, Europe/London)
| Day | What |
|---|---|
| **Monday 19:00** | New episode goes live |
| **Thursday 19:00** | New episode goes live |
| Sunday evening / Wednesday evening | Account holder sends results → Claude builds the next episode |

These times are a starting guess (evening scroll time). After 2–3 weeks, check TikTok Analytics (Followers → Follower activity) and adjust.

## What to send Claude after each episode (about 48 h after posting)
```
Episode: N
Followers: 1234
Vote: A 52 · B 31 · C 18          (count comments that say A/B/C or the option name)
Top comment: "build a giant stadium" by @someone, 812 likes
Usernames for houses: @a, @b, @c, ...  (paste as many as you like; Claude features about 10 up close and puts the rest on houses)
Anything notable: (duets, a funny comment, a request that keeps coming up)
Views / likes / shares (optional)
```

## City state
| | |
|---|---|
| Day | 0 |
| Population (followers) | 1 |
| Built | nothing: empty road grid, entrance highway, population sign |
| Houses (citizens) | none yet |
| City name on the sign | "YOUR CITY" (a future episode lets viewers vote on the name) |
| Open vote | **A** Hospital · **B** Stadium · **C** Giant mall |

## Episode log
| # | Planned post time (UK) | Title | Vote asked | Result | Built | Notes |
|---|---|---|---|---|---|---|
| 1 | Thu 19 Nov 2026, 19:00 | Population: 1 | Hospital / Stadium / Giant mall | (pending) | — | Pilot: rules introduced |
| 2 | Mon 23 Nov 2026, 19:00 | (depends on vote) | | | | |

## Ideas backlog (Claude's plan, in roughly this order)
- **Ep 2:** build the vote winner on camera (construction timelapse). Add the first citizens' houses with nameplates. The sign counts up to the real follower count. New vote.
- **Name the city:** viewers suggest names in the comments, then vote on the top three.
- **First disaster:** the top comment asks for a meteor or flood, and the city has to survive it.
- **Night episode:** the city lights up, and citizens' windows glow.
- **Milestone specials** at 100 / 1,000 / 10,000 followers: a fireworks show and a new district.
- **"Your house" replies:** reply to commenters with a 5-second clip of their own house.

## Production checklist (per episode)
1. Update **City state** and the **Episode log** above with the results.
2. Write the script: the narration lines and caption timings in `city-post/voice.mjs` (`LINES`), and the shots in `city-post/main.js` (`SHOTS`).
3. `node city-post/voice.mjs` → `python3 city-post/audio.py` → `node city-post/render.mjs --audio out/soundtrack.wav`
4. Check: scan for flickering frames, view stills, measure loudness.
5. Write `series/epNN/UPLOAD.md` (caption, hashtags, pinned comment, cover).
6. Commit and push.
