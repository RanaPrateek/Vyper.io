"""Brand kit builder: writes the vector logos to brand/assets/.

    python3 brand/build.py [--name "POPULATION" --word "YOU"]

Text is converted to outlines (Inter, SIL Open Font License) with HarfBuzz shaping, so the
SVGs render identically everywhere without the font installed.
Requires: pip install fonttools uharfbuzz
"""
import argparse
import os
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets")
FONTS = "/usr/share/fonts/opentype/inter"
BLACK = os.path.join(FONTS, "InterDisplay-Black.otf")
SEMI = os.path.join(FONTS, "Inter-SemiBold.otf")

# ---------------------------------------------------------------- palette (see brand guide)
SIGN_LIGHT, SIGN, SIGN_DARK = "#36A868", "#2E9D5B", "#23874F"
ORANGE = "#FF6A13"
INK = "#0D121D"
SKY_TOP, SKY_BOTTOM = "#4F86D4", "#A9C8EA"
POST = "#9AA1A8"
SIGN_TEXT = "#F4F7F2"

_fonts = {}


def _font(path):
    if path not in _fonts:
        blob = hb.Blob.from_file_path(path)
        face = hb.Face(blob)
        tt = TTFont(path)
        _fonts[path] = (hb.Font(face), face.upem, tt.getGlyphSet(), tt.getGlyphOrder())
    return _fonts[path]


def text_width(text, font_path, size, tracking=0.0):
    font, upem, _, _ = _font(font_path)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True})
    n = len(buf.glyph_infos)
    return sum(p.x_advance for p in buf.glyph_positions) * size / upem + tracking * size * (n - 1)


def text_path(text, font_path, size, x, y, anchor="middle", tracking=0.0):
    """SVG path data for text whose baseline starts at y. tracking is in em."""
    font, upem, gs, order = _font(font_path)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True})
    s = size / upem
    w = text_width(text, font_path, size, tracking)
    x0 = {"middle": x - w / 2, "end": x - w}.get(anchor, x)
    pen = SVGPathPen(gs)
    cx = 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        tp = TransformPen(pen, (s, 0, 0, -s, x0 + (cx + pos.x_offset) * s, y - pos.y_offset * s))
        gs[order[info.codepoint]].draw(tp)
        cx += pos.x_advance + tracking * upem
    return pen.getCommands()


def fit(text, font_path, size, max_w, tracking=0.0):
    while text_width(text, font_path, size, tracking) > max_w and size > 8:
        size -= 1
    return size


def svg(w, h, body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f"<defs>{defs}</defs>{body}</svg>\n")


SIGN_GRAD = (f'<linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">'
             f'<stop offset="0" stop-color="{SIGN_LIGHT}"/><stop offset="1" stop-color="{SIGN_DARK}"/></linearGradient>')


def sign_group(x, y, w, h, top, word, posts=True, post_h=None):
    """The highway sign: board, inset border, small top line, big word. Returns SVG elements."""
    r = h * 0.05
    inset = h * 0.045
    stroke = max(3, h * 0.018)
    els = []
    if posts:
        ph = post_h if post_h is not None else h * 0.32
        pw = w * 0.024
        for px in (x + w * 0.28, x + w * 0.72):
            els.append(f'<rect x="{px - pw / 2:.1f}" y="{y + h * 0.9:.1f}" width="{pw:.1f}" height="{ph + h * 0.1:.1f}" rx="{pw / 3:.1f}" fill="{POST}"/>')
    els.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r:.1f}" fill="url(#sg)"/>')
    els.append(f'<rect x="{x + inset:.1f}" y="{y + inset:.1f}" width="{w - 2 * inset:.1f}" height="{h - 2 * inset:.1f}" '
               f'rx="{r * 0.55:.1f}" fill="none" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="{stroke:.1f}"/>')
    inner = w - 2 * inset - h * 0.16
    ts = fit(top, SEMI, h * 0.15, inner, 0.08)
    els.append(f'<path fill="{SIGN_TEXT}" d="{text_path(top, SEMI, ts, x + w / 2, y + h * 0.36, tracking=0.08)}"/>')
    ws = fit(word, BLACK, h * 0.46, inner, 0.02)
    els.append(f'<path fill="{SIGN_TEXT}" d="{text_path(word, BLACK, ws, x + w / 2, y + h * 0.80, tracking=0.02)}"/>')
    return "".join(els)


def build(top, word):
    os.makedirs(OUT, exist_ok=True)
    files = {}

    # primary logo: sign on posts, transparent background
    W, H = 1200, 820
    files["logo.svg"] = svg(W, H, sign_group(60, 40, 1080, 560, top, word, post_h=200), SIGN_GRAD)

    # logo without posts (for tight spaces, stickers, watermarks)
    files["logo-board.svg"] = svg(1200, 640, sign_group(20, 20, 1160, 600, top, word, posts=False), SIGN_GRAD)

    # avatar: sky background, sign kept inside the circular safe area
    A = 1024
    sky = (f'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{SKY_TOP}"/>'
           f'<stop offset="1" stop-color="{SKY_BOTTOM}"/></linearGradient>')
    ground = f'<rect x="0" y="{A * 0.74:.0f}" width="{A}" height="{A * 0.26:.0f}" fill="#6D8749"/>'
    road = (f'<path d="M{A * 0.36:.0f} {A} L{A * 0.47:.0f} {A * 0.74:.0f} L{A * 0.53:.0f} {A * 0.74:.0f} L{A * 0.64:.0f} {A} Z" fill="#3A4558"/>'
            f'<path d="M{A * 0.497:.0f} {A * 0.76:.0f} h{A * 0.006:.0f} l{A * 0.006:.0f} {A * 0.08:.0f} h-{A * 0.018:.0f} Z" fill="#F2F2F2"/>'
            f'<path d="M{A * 0.49:.0f} {A * 0.89:.0f} h{A * 0.02:.0f} l{A * 0.008:.0f} {A * 0.11:.0f} h-{A * 0.036:.0f} Z" fill="#F2F2F2"/>')
    files["avatar.svg"] = svg(A, A, f'<rect width="{A}" height="{A}" fill="url(#sky)"/>{ground}{road}'
                              + sign_group(A * 0.09, A * 0.2, A * 0.82, A * 0.47, top, word, post_h=A * 0.06), SIGN_GRAD + sky)

    # wordmark: one line, two colours. Light (ink) and dark-background (white) versions.
    size = 160
    first = f"{top}: "
    w1 = text_width(first, BLACK, size, 0.01)
    w2 = text_width(word, BLACK, size, 0.01)
    WW, WH = int(w1 + w2 + 80), 240
    for name, col in (("wordmark.svg", INK), ("wordmark-white.svg", "#FFFFFF")):
        body = (f'<path fill="{col}" d="{text_path(first, BLACK, size, 40, 180, anchor="start", tracking=0.01)}"/>'
                f'<path fill="{ORANGE}" d="{text_path(word, BLACK, size, 40 + w1, 180, anchor="start", tracking=0.01)}"/>')
        files[name] = svg(WW, WH, body)

    for name, data in files.items():
        with open(os.path.join(OUT, name), "w") as f:
            f.write(data)
        print("wrote", os.path.join("brand/assets", name))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", default="POPULATION", help="small top line on the sign")
    ap.add_argument("--word", default="YOU", help="big word where the number goes")
    a = ap.parse_args()
    build(a.name.upper(), a.word.upper())
