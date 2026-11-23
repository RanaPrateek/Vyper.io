"""Episode 3 commenters -> city/state.json (run once)."""
import json, os, random
HERE = os.path.dirname(os.path.abspath(__file__)); STATE = os.path.join(HERE, "..", "city", "state.json")
d = json.load(open(STATE)); have = {c["name"] for c in d["citizens"]}; random.seed(4)
ROOFS = [0xd2653b, 0x3a7bd5, 0xe0b23a, 0x4fa36a, 0xc4507a, 0x7a5ac4, 0x2fb0b8, 0xe2733a]
SPECIAL = [
    ("R♡", "castle", 75, 175, "Can i be the queen with a castle", 17),
    ("Arran", "cheese", 12, 125, "day 2 of asking to be a huge block of cheese", 1),
    ("chris_r125yzf", "kebab", 38, 125, "Day 2 of asking to be boss man at my kebab shop", 0),
    ("Alex", "tiny", -75, 175, "Can I live in the smallest house possible?", 0),
    ("~Skyla~", "taco", -61, 175, "Can I pls live in a taco. Been here since 20 followers", 1),
    ("Penny", "rainbow", -36, 75, "Can I have a rainbow neon house pleaseee", 1),
    ("chlo", "crystal", -14, 75, "can I have a pink crystal tree please I follow liked shared and reposted", 5),
]
PLAIN = ["Rhea", "imogen.privvv", "elayna", "Lolas life", "Amelie", "Evill", "alexisxspam", "pixie", "stizz28", "rose?", "ava🪷",
         "•isabelle", "georgie", "Zara", "Dillon", "LLR", "Sadie🦄", "triggleton", "Clara Angus", "erin", "Rose🌇", "LYDIA",
         "Auriah & Lauren", "CM_11", "Paige", "6.a_klase_svs_crazy", "Ellie:3", "LANA", "Wenny", "Orla", "CONNIE", "Ysabel",
         "ELLA", "Miami 👀", "Rose ~", "tilda_at_your_service", "Emiko", "Georgia_grace123", "Claudie", "Louis", "ellie"]
COL = {"ellie": (0x3fe0e8, 0x1f9aa8), "Rose ~": (0xff4fb8, 0xffb6d5), "LANA": (0xffffff, 0x3ab0ff)}
occ = {(round(c["x"]), round(c["z"])) for c in d["citizens"]}
blocked = {(75, 175), (25, 125), (-75, 175), (-25, 75), (-75, -75), (-75, -25), (-75, 25), (25, -75), (25, -25), (-25, -75), (-25, -25)}
plots = sorted([(x, z) for x in range(-375, 400, 50) for z in range(-375, 400, 50)
                if (x, z) not in blocked and not (125 <= x <= 325 and 125 <= z <= 425)
                and not any(abs(ox - x) < 25 and abs(oz - z) < 25 for ox, oz in occ)],
               key=lambda p: (abs(p[0]) * 1.4 + (400 - p[1])))
slots = [(px + dx, pz + dz) for (px, pz) in plots for dz in (11, -1, -13) for dx in (-12, 0, 12)]
added = []
for name, kind, x, z, req, likes in SPECIAL:
    if name not in have: added.append({"name": name, "house": kind, "x": x, "z": z, "since_episode": 4, "comment": req, "likes": likes})
k = 0
for name in PLAIN:
    if name in have: continue
    x, z = slots[k]; k += 1
    e = {"name": name, "house": "house", "x": x, "z": z, "since_episode": 4, "roof": random.choice(ROOFS)}
    if name in COL: e["wall"], e["roof"] = COL[name]
    added.append(e)
d["citizens"] += added
for c in d["citizens"]:
    if c["name"] == "Emijinx": c["christmas"] = {"since_episode": 4}
if not any(b["id"] == "waterpark" for b in d["buildings"]):
    d["buildings"].append({"id": "waterpark", "type": "waterpark", "x": -75, "z": -75, "manager": "Ellis", "since_episode": 4, "won_vote": "Ep 3: Water park 80%"})
json.dump(d, open(STATE, "w"), indent=1, ensure_ascii=False)
print(f"added {len(added)}; total {len(d['citizens'])}")
