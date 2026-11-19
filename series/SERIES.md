# Population: You: series log

> The show's memory. Every new session starts by reading this file, and every episode ends by updating it.

**Account:** TikTok [`@populationyou`](https://www.tiktok.com/@populationyou), created Thu 19 Nov 2026
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
**From Episode 2: every other day at 19:00** (Sat 21, Mon 23, Wed 25 Nov…). We move to **daily** once growth picks up. The most successful show in this genre posts daily; see `RESEARCH.md`.
TikTok polls close after 24 h, which fits this rhythm: the poll closes, results go to Claude that evening or the next morning, and the episode is ready by 17:00 for a 19:00 post.

| When | What |
|---|---|
| Day of posting, 19:00 | Episode goes live, with the poll in the pinned comment |
| About 24 h later | Poll closes. Account holder sends screenshots (profile, comments, poll, analytics) |
| Next day by 17:00 | Claude delivers the next episode and its upload sheet |

Check TikTok Analytics (Follower activity) after 2–3 weeks and adjust the time.

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
| Open vote | **A** Hospital · **B** Stadium · **C** Giant mall. A TikTok poll in the pinned comment (closes Fri 20 Nov evening), plus votes written in comments |
| Early citizens (Ep 1) | Kasparita (votes giant mall), Hollie M. Display names only so far: need their @usernames for nameplates |

## Episode log
| # | Planned post time (UK) | Title | Vote asked | Result | Built | Notes |
|---|---|---|---|---|---|---|
| 1 | Posted Thu 19 Nov 2026 (~20:15) | Population: 1 | Hospital / Stadium / Giant mall | (pending) | — | Pilot: rules introduced. End card shows the old handle `@population.you`; left as is |
| 2 | Sat 21 Nov 2026, 19:00 | (depends on vote) | | | | First episode using the research upgrades |

## Feedback to apply from Episode 2 (account holder, 19 Nov 2026)
Episode 1 stays as posted. Don't re-render it. Apply all of these to new episodes:

1. **Text is too big and gets clipped.** Long titles like "1 COMMENT = 1 HOUSE" run to the screen edges and lose characters, and TikTok's own UI covers the edges too.
   - Make titles and captions smaller and keep them inside TikTok's safe area: roughly 60 px clear at each side, about 140 px clear on the right for the like/comment buttons, and the top ~200 px and bottom ~420 px kept clear of key text.
   - Shrink long titles to fit that width rather than letting them touch the edges. Check every title on a phone-sized preview with the TikTok UI drawn over it.
2. **The narration sounds like someone reading captions.** The rhythm is uneven and it doesn't sound like a real person talking.
   - Cause: each line is generated separately and dropped onto the caption times, so the voice restarts its rhythm every line.
   - Fix: write the script as natural spoken paragraphs, generate each beat as one continuous take, and let the pauses fall naturally. Then fit the visuals and captions to the voice, not the voice to the captions. Try other voices and settings, and compare takes.
3. **Profile banner.** TikTok profiles can show a background image behind the profile header (like the example the account holder shared). Make one for Population: You. Check TikTok's current size and safe-area guidance first.
4. **End card handle:** Episode 1 shows `@population.you`. From Episode 2 it must say **@populationyou** (already fixed in `city-post/`).
5. **Upload label:** Episode 1 went out with a "Promotional content" tag. That's for paid or brand promotions and can limit reach. Next time, leave the promotional/branded-content disclosure off and use the **AI-generated** label instead.

## Milestone ladder
| Citizens | Unlock |
|---|---|
| 100 | **Electricity:** the first night episode, with the city lit up |
| 1,000 | **The city opens to the public:** a website where viewers walk around the city and visit their own house (account holder's idea, 19 Nov 2026). TikTok generally needs around 1,000 followers for a clickable bio link, so launch the site and the link together |

Tease the next milestone with a progress bar in every episode.

### Website plan ("Visit the city")
- **Same Three.js city as the episodes,** with a separate page that reuses the world code (`city-web/`).
- **Find my house:** search a username and fly to your house and nameplate.
- **Free roam:** a virtual joystick on mobile and WASD/arrow keys on desktop; the pigeon sidekick follows you.
- **Updated every episode:** new buildings, citizens' houses and the Founders' Wall, from a citizens data file.
- **Mobile first:** smooth on mid-range phones, using instancing and low-poly models, with no logins or personal data (usernames only, same house rules as the show).
- **Hosting:** GitHub Pages from this repo, or a custom domain later (check `populationyou.com` availability).
- **Build timing:** start after Episode 2 ships, in the gaps between episodes. Ready and tested well before 1,000.

## Format upgrades from research (apply from Ep 2; details in `RESEARCH.md`)
- **Hook:** the sign counts from yesterday's population to today's in the first 4 s ("Yesterday: 1. Today: N.").
- **Sidekick:** a **pigeon who lives on the population sign** and judges every build. Viewers get to name it.
- **Shout-outs:** 4–6 named commenters per episode, each granted literally with a punchline, with their comment card on screen.
- **Results** revealed lowest to highest, with a crown on the winner.
- **Milestones:** 100 citizens = electricity (night episode); 1,000 = the city opens as a website. Show a progress bar.
- **Founders' Wall** at the city entrance with every early citizen's name, and **end on a citizen list** ("pause to find your name").
- **Look:** more colour (varied roof colours) and tiny citizens in the streets. Smaller titles, inside the safe area.
- **Narration:** conversational and funny, generated as continuous takes. Episodes about 50–60 s.

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
