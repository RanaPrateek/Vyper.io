"""The citizens list: who already has a house, and a checker for new names.

    python3 tools/citizens.py list                  -> writes series/CITIZENS.md and series/CITIZENS.csv
    python3 tools/citizens.py check "Name 1" "Name 2" ...
    python3 tools/citizens.py check --file names.txt   (one name per line)

check sorts each name into:
  HAS A HOUSE   - exact match (or the same name ignoring emoji, symbols and capitals)
  MAYBE         - a similar name exists (e.g. "Rose" vs "rose⭐"); a person decides
  NEW           - no house yet; give them one
Source of truth: city/state.json (the same file the episodes and the future website read).
"""
import csv
import difflib
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
STATE = os.path.join(ROOT, "city", "state.json")
SERIES = os.path.join(ROOT, "..", "series")

KIND = {"house": "House", "neon": "Neon pink house", "car": "Car house", "mansion": "Mansion", "villa": "Villa (Billionaires' Hill)",
        "potato": "Potato house", "duck": "Rubber duck house", "shoe": "Shoe house", "ostrich": "Ostrich house",
        "nugget": "Nugget house", "statue": "Inside the pigeon statue", "castle": "Castle", "cheese": "Cheese block",
        "taco": "Taco house", "rainbow": "Rainbow neon house", "crystal": "Crystal tree", "tiny": "Tiny house"}


def key(name):
    """Comparable form: letters and digits only, lower case, accents removed."""
    s = unicodedata.normalize("NFKD", name)
    return re.sub(r"[^a-z0-9]", "", s.encode("ascii", "ignore").decode().lower())


def load():
    return json.load(open(STATE))


def describe(c):
    k = "Tiny house" if c.get("tiny") else KIND.get(c["house"], c["house"])
    extras = []
    if c.get("extension"): extras.append("neon purple extension")
    if c.get("christmas"): extras.append("Christmas lights")
    if c.get("district"): extras.append(c["district"])
    return k + (f" ({', '.join(extras)})" if extras else "")


def plot(c):
    px, pz = round((c["x"] - 25) / 50) * 50 + 25, round((c["z"] - 25) / 50) * 50 + 25
    return f"{px},{pz}"


def cmd_list():
    d = load(); cs = d["citizens"]
    os.makedirs(SERIES, exist_ok=True)
    with open(os.path.join(SERIES, "CITIZENS.csv"), "w", newline="") as f:
        w = csv.writer(f); w.writerow(["#", "name", "since_episode", "house", "plot", "their_comment", "shown_up_close"])
        for i, c in enumerate(cs, 1):
            w.writerow([i, c["name"], c["since_episode"], describe(c), plot(c), c.get("comment", ""), "yes" if c.get("shown") else ""])
    by_ep = {}
    for c in cs: by_ep.setdefault(c["since_episode"], []).append(c)
    out = [f"# Citizens: who already has a house ({len(cs)})", "",
           "Generated from `city-post/city/state.json` by `python3 city-post/tools/citizens.py list`. Don't edit by hand.",
           "", "**Before adding new people, check them:** `python3 city-post/tools/citizens.py check \"name\" ...`",
           "It says HAS A HOUSE, MAYBE (a similar name exists, so check the profile picture) or NEW.", ""]
    for b in d.get("buildings", []):
        pass
    for ep in sorted(by_ep):
        out += [f"## Built in Episode {ep} ({len(by_ep[ep])})", "", "| # | Name | House | Plot | Their comment |", "|---|---|---|---|---|"]
        for c in by_ep[ep]:
            out.append(f"| {cs.index(c) + 1} | {c['name']} | {describe(c)} | {plot(c)} | {c.get('comment', '').replace('|', '/')[:90]} |")
        out.append("")
    # possible duplicates inside the list itself
    keys = {}
    for c in cs:
        if key(c["name"]): keys.setdefault(key(c["name"]), []).append(c["name"])
    dups = [v for v in keys.values() if len(v) > 1]
    near = []
    names = [c["name"] for c in cs]
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            ka, kb = key(a), key(b)
            if ka and kb and ka != kb and (ka.startswith(kb) or kb.startswith(ka)) and min(len(ka), len(kb)) >= 4:
                near.append((a, b))
    out += ["## Possible duplicates to check", "",
            "These may be the same person twice, or different people with similar names. Check the profile pictures.", ""]
    out += [f"- Same name: {', '.join(v)}" for v in dups] or ["- Same name: none"]
    out += [f"- Similar: {a} / {b}" for a, b in near] or ["- Similar: none"]
    open(os.path.join(SERIES, "CITIZENS.md"), "w").write("\n".join(out) + "\n")
    print(f"wrote series/CITIZENS.md and series/CITIZENS.csv ({len(cs)} citizens, {len(dups)} same-name groups, {len(near)} similar pairs)")


def cmd_check(names):
    cs = load()["citizens"]
    exact = {c["name"]: c for c in cs}
    bykey = {}
    for c in cs: bykey.setdefault(key(c["name"]), []).append(c)
    allkeys = list(bykey)
    res = {"HAS A HOUSE": [], "MAYBE": [], "NEW": []}
    for n in names:
        n = n.strip()
        if not n: continue
        aka = [c for c in cs if n in c.get("also_known_as", [])]
        if n in exact or aka:
            c = exact.get(n) or aka[0]
            res["HAS A HOUSE"].append(f"{n}  ->  {describe(c)}, Episode {c['since_episode']}" + (f" (listed as '{c['name']}')" if c['name'] != n else "")); continue
        k = key(n)
        if k and k in bykey:
            group = bykey[k]
            if len(group) == 1:
                c = group[0]; res["HAS A HOUSE"].append(f"{n}  ->  listed as '{c['name']}': {describe(c)}, Episode {c['since_episode']}")
            else:
                res["MAYBE"].append(f"{n}  ->  {len(group)} citizens with this name: " + ", ".join(f"'{c['name']}'" for c in group) + ". Check the profile picture")
            continue
        close = difflib.get_close_matches(k, allkeys, n=3, cutoff=0.8) if k else []
        pref = [kk for kk in allkeys if k and len(k) >= 4 and (kk.startswith(k) or k.startswith(kk)) and len(kk) >= 4]
        cands = list(dict.fromkeys(close + pref))[:3]
        if cands:
            res["MAYBE"].append(f"{n}  ->  similar to " + ", ".join(f"'{bykey[c][0]['name']}'" for c in cands))
        else:
            res["NEW"].append(n)
    for k, v in res.items():
        print(f"\n{k} ({len(v)})"); [print("  " + x) for x in v]


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] == "list":
        cmd_list()
    elif sys.argv[1] == "check":
        args = sys.argv[2:]
        if args[:1] == ["--file"]:
            args = open(args[1]).read().splitlines()
        cmd_check(args)
