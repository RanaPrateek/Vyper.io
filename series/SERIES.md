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
**From Episode 3: daily at 19:00 UK** (decided Fri 20 Nov: "we'll be creating every 24 hrs"). Set polls to 1 day.
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
| Day | 3 |
| Population (followers) | **260** (Sat 21 Nov). The 100-citizen electricity milestone has been reached, so Episode 4 is the night episode with the lights coming on |
| Built | **Giant mall** (Ep 2), 15 citizens' houses (Ep 2): see `city-post/city/state.json`, the source of truth for the world |
| Houses (citizens) | 194 (15 from Ep 2, 179 from Ep 3, including 30 villas on Billionaires' Hill) |
| City name on the sign | "YOUR CITY" (a future episode lets viewers vote on the name) |
| Previous vote (Ep 1) | **A** Hospital · **B** Stadium · **C** Giant mall: mall won. A TikTok poll in the pinned comment (closes Fri 20 Nov evening), plus votes written in comments |
| Early citizens (Ep 1) | Kasparita (votes giant mall), Hollie M. Display names only so far: need their @usernames for nameplates |

## Episode 1 results (screenshots, Fri 20 Nov morning; the poll still had 12 h left)
- **Poll (22 votes):** Giant mall **73%** · Hospital 18% · Stadium 9%. Mall wins by a clear margin.
- **Top comment:** Kasparita, "I need a houseeee!!! giant mall is the way to go" (3 likes, first comment).
- **Citizens (15), with display names as shown:**
  - Kasparita
  - Hollie M
  - Tamara: wants a neon pink house
  - Emilia🦖: wants a car as a house; voted Hospital
  - Priya Somers: wants a house, "and defo a mall"
  - Sophiaw_close ("my name is Sophia_w")
  - Sophia🦢🧁
  - Jess🦢
  - Rose: said "Hi"
  - 🎀🧸
  - 🐻leya
  - erinn🤍: said "Mee"
  - christinas_privvvv: wants a mansion
  - r0sie670
  - emma🖤
- **Naming rule used on air:** first name or handle only, never a full name (so "Priya", not "Priya Somers"; "Hollie", not "Hollie M"). Emoji-only names appear on the wall and their house as the emoji.
- **Still needed before the final render:** today's follower count (profile screenshot) and the final poll percentages.

## Episode log
| # | Planned post time (UK) | Title | Vote asked | Result | Built | Notes |
|---|---|---|---|---|---|---|
| 1 | Posted Thu 19 Nov 2026 (~20:15) | Population: 1 | Hospital / Stadium / Giant mall | (pending) | — | Pilot: rules introduced. End card shows the old handle `@population.you`; left as is |
| 2 | **Posted Thu 19 Nov 2026 evening** (the draft, which said 25 citizens) | We built it | Skate park / Fire station / Cinema, plus name the pigeon | After 10 h: **Cinema 59%** (290 votes, 7-day poll) | Giant mall, 15 houses, the pigeon | **5,641 views · 367 likes · 203 comments** in 10 h, roughly 35× Episode 1. All requests are in `series/ep02/COMMENTS.md` |
| 3 | Sat 21 Nov 2026, 19:00 | A whole new neighbourhood | Water park / Castle / Town centre | (pending) | 149 houses (6 specials: potato, rubber duck, shoe, ostrich, nugget, pigeon statue), Billionaires' Hill (30 villas), cinema, Tamara's neon purple extension; the pigeon is named Kevin | Final render uses the real count of 260 followers |

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

## Production checklist (per episode, Episode 2 onward)
1. Update `city-post/city/state.json` (new citizens and buildings) and **City state** / **Episode log** above.
2. Copy the previous episode folder (`city-post/epNN/`): write `script.json` (story beats, natural spoken sentences) and `config.json` (followers, poll), and adjust the `SHOTS` in `main.js`.
3. `city-post/tools/build_episode.sh epNN`: narration (one Kokoro take per beat), then Whisper caption timing, then soundtrack, then render.
4. Check: stills of every shot, a scan for flickering frames, loudness of about -14 LUFS, and text inside the safe area.
5. Write `series/epNN/UPLOAD.md` (caption, pinned poll, cover time, reply plan). Commit and push.
