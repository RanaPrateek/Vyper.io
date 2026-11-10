"""Builds brand/index.html: a single self-contained brand guide (images and audio embedded).

    python3 brand/guide.py
Run build.py, sonic.py and render.mjs first.
"""
import base64
import os

HERE = os.path.dirname(os.path.abspath(__file__))
A = lambda *p: os.path.join(HERE, "assets", *p)  # noqa: E731


def uri(path, mime):
    with open(path, "rb") as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode()


def svg(name):
    return uri(A(name), "image/svg+xml")


def mp3(path):
    return uri(path, "audio/mpeg")


PALETTE = [
    ("Sign Green", "#2E9D5B", "Logo, the population sign, primary brand colour", "#fff"),
    ("Sign Green Dark", "#23874F", "Sign gradient base, pressed states", "#fff"),
    ("Build Orange", "#FF6A13", "Pills, tags, vote options, the word YOU", "#fff"),
    ("Caption Orange", "#FF8A1C", "The spoken word in captions (lighter for legibility)", "#111"),
    ("Asphalt", "#3A4558", "Roads, dark surfaces, secondary text on light", "#fff"),
    ("Plot Sand", "#C8B39B", "Empty plots, warm neutral backgrounds", "#111"),
    ("Sky", "#4F86D4", "Daytime sky, avatar background", "#fff"),
    ("Night", "#0D121D", "End cards, ink on light backgrounds", "#fff"),
]

NAMES = [
    ("Population: You", "Recommended. Turns the signature sign into the name and makes the viewer the subject. "
     "The sign can show the real follower count every episode, so the hook is the brand.", True),
    ("Commentville", "The clearest description of the mechanic. Friendly, but tied to comments only (not follows or votes).", False),
    ("Crowdtown", "Short, crowd-built and easy to say. Less specific about how the crowd builds it.", False),
    ("Votropolis", "Vote + metropolis. Distinctive, but harder to spell and say out loud.", False),
    ("Day Zero City", "Leans into the episodic 'Day N' format. Feels like a series title more than a brand.", False),
    ("Citizen One", "Starts from 'population: 1'. Strong first episode, but the number dates as the city grows.", False),
]

SFX = [("sfx-whoosh", "Whoosh", "every cut"), ("sfx-pop", "Pop", "anything appearing"),
       ("sfx-build-thunk", "Build thunk", "a building landing"), ("sfx-tick", "Tick", "counters"),
       ("sfx-riser", "Riser", "into a reveal"), ("sfx-impact", "Impact", "the reveal"), ("sfx-chime", "Chime", "end card")]


def build():
    pal = "".join(
        f'<div class="sw"><div class="chip" style="background:{h};color:{fg}">{h}</div><b>{n}</b><span>{use}</span></div>'
        for n, h, use, fg in PALETTE)
    names = "".join(
        f'<tr class="{"rec" if rec else ""}"><td><b>{n}</b>{" <em>Recommended</em>" if rec else ""}</td><td>{why}</td></tr>'
        for n, why, rec in NAMES)
    sfx = "".join(
        f'<div class="sfx"><b>{label}</b><span>{use}</span><audio controls preload="none" src="{mp3(A("preview", f + ".mp3"))}"></audio></div>'
        for f, label, use in SFX)

    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Population: You · Brand guide</title>
<style>
  :root {{ --green:#2E9D5B; --orange:#FF6A13; --ink:#0D121D; --asphalt:#3A4558; --sand:#C8B39B; --bg:#F6F4F0; --line:#E3DED6; --muted:#5d6675; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--bg); color:var(--ink); font:16px/1.55 Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }}
  header {{ background:var(--ink); color:#fff; padding:56px 24px 64px; text-align:center; }}
  header img {{ width:min(520px,86vw); }}
  header p {{ margin:18px 0 0; font-size:22px; font-weight:700; }} header p b {{ color:#FF8A1C; }}
  main {{ max-width:1040px; margin:0 auto; padding:8px 24px 80px; }}
  section {{ padding:44px 0; border-bottom:1px solid var(--line); }}
  h2 {{ font-size:13px; letter-spacing:3px; text-transform:uppercase; color:var(--green); margin:0 0 6px; }}
  h3 {{ font-size:30px; line-height:1.15; margin:0 0 16px; font-weight:900; }}
  p.lead {{ font-size:18px; color:#2b3340; max-width:760px; }}
  .grid {{ display:grid; gap:20px; }} .g2 {{ grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); }}
  .g4 {{ grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); }}
  .card {{ background:#fff; border:1px solid var(--line); border-radius:16px; padding:20px; }}
  .card.dark {{ background:var(--ink); border-color:var(--ink); color:#fff; }}
  .card img {{ max-width:100%; display:block; margin:0 auto; }}
  .cap {{ font-size:13px; color:var(--muted); margin-top:10px; text-align:center; }} .dark .cap {{ color:#aeb6c4; }}
  table {{ width:100%; border-collapse:collapse; background:#fff; border-radius:16px; overflow:hidden; border:1px solid var(--line); }}
  td {{ padding:14px 16px; border-top:1px solid var(--line); vertical-align:top; }} tr:first-child td {{ border-top:0; }}
  td:first-child {{ width:230px; white-space:nowrap; }}
  tr.rec td {{ background:#EEF8F1; }} em {{ font-style:normal; font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase;
    background:var(--green); color:#fff; padding:2px 8px; border-radius:20px; margin-left:6px; vertical-align:2px; }}
  .sw {{ display:flex; flex-direction:column; gap:2px; }} .sw span {{ font-size:13px; color:var(--muted); }}
  .chip {{ height:92px; border-radius:14px; display:flex; align-items:flex-end; padding:10px 12px; font:600 13px/1 'JetBrains Mono', ui-monospace, monospace; margin-bottom:8px; }}
  .type-title {{ font-family:'Inter Display',Inter,sans-serif; font-weight:900; font-size:56px; line-height:1; color:#fff;
    text-shadow:0 4px 0 rgba(0,0,0,.55),0 0 18px rgba(0,0,0,.4); }}
  .type-cap {{ font-weight:800; font-size:40px; color:#fff; paint-order:stroke fill; -webkit-text-stroke:8px #000; }} .type-cap .hl {{ color:#FF8A1C; }}
  .pill {{ display:inline-block; background:#fff; color:#111; font-weight:800; font-size:14px; padding:4px 14px; border-radius:30px; }}
  .stage {{ background:linear-gradient(#4F86D4,#A9C8EA); border-radius:16px; padding:28px; text-align:center; display:flex; flex-direction:column; gap:14px; align-items:center; }}
  .snd {{ display:flex; flex-direction:column; gap:8px; }} audio {{ width:100%; }}
  .sfxs {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }}
  .sfx {{ background:#fff; border:1px solid var(--line); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:4px; }}
  .sfx span {{ font-size:13px; color:var(--muted); }}
  ol.formula {{ counter-reset:s; list-style:none; padding:0; margin:0; display:grid; gap:10px; }}
  ol.formula li {{ background:#fff; border:1px solid var(--line); border-radius:12px; padding:14px 16px 14px 60px; position:relative; }}
  ol.formula li::before {{ counter-increment:s; content:counter(s); position:absolute; left:16px; top:13px; width:30px; height:30px; border-radius:50%;
    background:var(--orange); color:#fff; font-weight:900; display:flex; align-items:center; justify-content:center; }}
  .do li {{ margin:4px 0; }} code, .copy {{ font-family:'JetBrains Mono', ui-monospace, monospace; font-size:14px; }}
  .copy {{ background:#fff; border:1px dashed #bfb6a8; border-radius:10px; padding:14px 16px; white-space:pre-wrap; }}
  .covers {{ display:grid; grid-template-columns:220px 1fr; gap:20px; align-items:start; }}
  @media (max-width:700px) {{ .covers {{ grid-template-columns:1fr; }} td:first-child {{ white-space:normal; width:auto; }} }}
  footer {{ text-align:center; color:var(--muted); font-size:13px; padding:30px; }}
</style></head><body>
<header><img src="{svg('logo.svg')}" alt="Population: You logo"><p>A city built by its <b>followers</b>.</p></header>
<main>

<section><h2>The idea</h2><h3>You are the population.</h3>
<p class="lead">Every episode, a city grows, and the audience builds it. Follow and you become a citizen.
Comment and you get a house with your name on it. The most-liked comment decides what gets built next. The green population sign
at the edge of town is the show's signature. It counts the real followers, so the hook and the brand are the same thing.</p></section>

<section><h2>Name</h2><h3>Population: You</h3>
<p class="lead">Six candidates, ranked. Before you commit, check that the handles and domain are free on each platform and run a trademark search. These suggestions haven't been checked for availability.</p>
<table>{names}</table></section>

<section><h2>Logo</h2><h3>The sign is the logo.</h3>
<p class="lead">It's the town sign with the number replaced by <b>YOU</b>. The lettering is converted to vector outlines (Inter, SIL Open Font License), so the SVGs look the same on any device.</p>
<div class="grid g2">
  <div class="card"><img src="{svg('logo.svg')}" style="width:80%"><div class="cap">Primary · <code>logo.svg</code>. Use it wherever there's room for the posts.</div></div>
  <div class="card"><img src="{svg('logo-board.svg')}" style="width:80%"><div class="cap">Board · <code>logo-board.svg</code>. For tight spaces, watermarks and end cards.</div></div>
  <div class="card"><img src="{svg('avatar.svg')}" style="width:46%;border-radius:50%"><div class="cap">Avatar · <code>avatar.svg</code> / <code>png/avatar.png</code>. Safe inside a circle crop.</div></div>
  <div class="card"><img src="{svg('wordmark.svg')}" style="width:92%"><div class="cap">Wordmark · <code>wordmark.svg</code>. For text-only spots.</div></div>
  <div class="card dark"><img src="{svg('wordmark-white.svg')}" style="width:92%"><div class="cap">Wordmark on dark · <code>wordmark-white.svg</code></div></div>
  <div class="card"><ul class="do">
    <li><b>Clear space:</b> keep the height of the word YOU empty around the sign.</li>
    <li><b>Minimum size:</b> 120 px wide for the board, 48 px for the avatar.</li>
    <li><b>Don't</b> recolour the board, stretch it, add effects, or put a number in place of YOU in the logo. Numbers belong on the in-show sign.</li></ul></div>
</div></section>

<section><h2>Colour</h2><h3>Built from the city.</h3>
<p class="lead">Every colour comes from the world itself: the sign, the roads, the plots and the sky. Green means the brand; orange means "you can act on this".</p>
<div class="grid g4">{pal}</div></section>

<section><h2>Type</h2><h3>Inter, three ways.</h3>
<div class="grid g2">
  <div class="stage"><span class="pill">DAY 0</span><div class="type-title">POPULATION: 1</div>
    <div class="type-cap">no <span class="hl">shops,</span></div></div>
  <div class="card"><ul class="do">
    <li><b>Titles:</b> Inter Display Black, all caps, white with a hard drop shadow. One short line.</li>
    <li><b>Label pill:</b> Inter ExtraBold on a white pill (<code>DAY 0</code>, <code>RULE 2</code>, <code>VOTE NOW</code>).</li>
    <li><b>Captions:</b> Inter ExtraBold, white with a thick black outline. The word being spoken turns Caption Orange. Two to four words per line.</li>
    <li><b>Sign:</b> Inter SemiBold and Medium, letterspaced.</li></ul>
    <p class="cap" style="text-align:left">Inter is free under the SIL Open Font License, at rsms.me/inter.</p></div>
</div></section>

<section><h2>Sound</h2><h3>The population going up.</h3>
<p class="lead">The sonic logo is the counter ticking upward through a C-major arpeggio, then a pop and a bell chord when it arrives. In the voiced version the narrator says "Population: you", and the pop lands on "you". The music, sound effects and logo all come from one synth palette, generated in code, so there are no samples or licensing.</p>
<div class="grid g2">
  <div class="card snd"><b>Sonic logo</b><span class="cap" style="text-align:left;margin:0">3 s · opens and closes every video, notification sound</span>
    <audio controls preload="none" src="{mp3(A('audio', 'sonic-logo.mp3'))}"></audio></div>
  <div class="card snd"><b>Sonic logo + voice tag</b><span class="cap" style="text-align:left;margin:0">3.4 s · end cards, ads, the start of podcasts or streams</span>
    <audio controls preload="none" src="{mp3(A('audio', 'sonic-logo-voice.mp3'))}"></audio></div>
  <div class="card snd"><b>Theme loop</b><span class="cap" style="text-align:left;margin:0">8 s, loops seamlessly · 120 BPM, I–V–vi–IV in C</span>
    <audio controls loop preload="none" src="{mp3(A('audio', 'theme-loop.mp3'))}"></audio></div>
  <div class="card"><ul class="do">
    <li><b>Narrator:</b> Kokoro-82M, voice <code>af_heart</code>, speed 1.1. Warm, quick and slightly amused.</li>
    <li><b>Mix:</b> about -14 LUFS, peaks at -1 dBFS. Music drops about 10 dB under the voice.</li>
    <li><b>Sound effects on visuals:</b> a whoosh on every cut and a pop on every pop-in. Keep it consistent.</li></ul></div>
</div>
<h3 style="font-size:20px;margin-top:28px">Sound-effects pack</h3><div class="sfxs">{sfx}</div></section>

<section><h2>Voice &amp; tone</h2><h3>Short. Second person. Rules, not requests.</h3>
<div class="grid g2">
  <div class="card"><ul class="do">
    <li>Talk to one person: <b>you</b>. The audience are <b>citizens</b>, not followers.</li>
    <li>State rules as rules: "Rule two: comment, and I'll build you a house."</li>
    <li>Keep a line to one breath, about 4 to 9 words.</li>
    <li>Every episode ends on a choice and a promise: "Vote in the comments. Results next episode."</li></ul></div>
  <div class="card"><b>Signature lines</b><ul class="do">
    <li>"This city has one resident."</li><li>"Follow, and you're officially a citizen."</li>
    <li>"Whatever it says, I build. No matter what."</li><li>"Results next episode."</li><li>"Follow to move in."</li></ul></div>
</div></section>

<section><h2>Episode formula</h2><h3>35–45 seconds, every time.</h3>
<ol class="formula">
  <li><b>Day + population</b>: open on the sign with the real follower count. <span class="pill" style="background:#EEF8F1">DAY N</span></li>
  <li><b>What changed</b>: last vote's winner gets built on camera, with build thunks, rising floors and an impact.</li>
  <li><b>Shout-outs</b>: show new houses with commenters' names on the nameplates.</li>
  <li><b>The top comment</b>: show the card and the like count, and promise to build it no matter what.</li>
  <li><b>The vote</b>: three plots, A / B / C, top-down. Orange tags pop in as each option is said.</li>
  <li><b>End card</b>: sonic logo, "Follow to move in", handle.</li></ol></section>

<section><h2>Platform kit</h2><h3>Ready to upload.</h3>
<div class="covers">
  <div class="card"><img src="{uri(A('preview', 'cover-ep1.jpg'), 'image/jpeg')}" style="border-radius:10px"><div class="cap">Episode cover · <code>png/cover-ep1.png</code></div></div>
  <div class="grid">
    <div class="card"><img src="{uri(A('preview', 'banner-youtube.jpg'), 'image/jpeg')}" style="border-radius:10px"><div class="cap">YouTube banner 2560×1440 · logo inside the 1546×423 safe area</div></div>
    <div class="card"><img src="{uri(A('preview', 'banner-x.jpg'), 'image/jpeg')}" style="border-radius:10px"><div class="cap">X / LinkedIn header 1500×500</div></div>
  </div></div>
<h3 style="font-size:20px;margin-top:28px">Bio</h3>
<div class="copy">A city built by its followers 🏙️
Follow = citizen · Comment = house · Top comment rules.
New day every episode.</div></section>

</main>
<footer>Population: You · brand guide · Assets in <code>brand/assets/</code>. Rebuild with <code>python3 brand/build.py &amp;&amp; python3 brand/sonic.py &amp;&amp; node brand/render.mjs &amp;&amp; python3 brand/guide.py</code></footer>
</body></html>"""
    out = os.path.join(HERE, "index.html")
    with open(out, "w") as f:
        f.write(html)
    print("wrote brand/index.html", f"{os.path.getsize(out) / 1e6:.1f} MB")


if __name__ == "__main__":
    build()
