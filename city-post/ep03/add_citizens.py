"""Adds the Episode 2 commenters to city/state.json (run once). Names are shown as display names,
surnames trimmed; skipped comments still get a plain house (the person is a citizen, the joke isn't aired).
Positions: specials on the entrance street, ordinary houses 9 per plot outward from the entrance,
Billionaires' Hill on a raised lawn east of the entrance."""
import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(HERE, "..", "city", "state.json")
d = json.load(open(STATE))
have = {c["name"] for c in d["citizens"]}
random.seed(3)
ROOFS = [0xd2653b, 0x3a7bd5, 0xe0b23a, 0x4fa36a, 0xc4507a, 0x7a5ac4, 0x2fb0b8, 0xe2733a]

SPECIAL = [  # name, type, request (plot centre, offset)
    ("Miley", "potato", "Can I have a potato as my house please and my name is Miley", (-75, 375), -10),
    ("Kai", "duck", "Can I have a house shaped like a pink rubber ducky and my name is Kai", (-75, 375), 10),
    ("Lilyy", "shoe", "Can I live in a massive shoe please", (75, 375), -9),
    ("Evaa🤍", "nugget", "CAN I HAVE A NUGGET HOUSEE", (75, 375), 11),
    ("Olivia🥲", "ostrich", "can I have a house shaped as a ostrich", (-75, 325), -9),
    ("Kacee", "statue", "Can I live inside a statue of the pigeon 🙏", (-75, 325), 10),
]
COLOURED = {  # name: (wall, roof, request)
    "katie🦦": (0xb48ad8, 0x6a3fa0, "wait i want a purple house pls"),
    "Josefine🤍": (0xffb6d5, 0xe8578a, "Can i have a pink house?"),
    "samanta": (0xff4fa8, 0xd61f7a, "can I have a hot pink house"),
    "bellahar🐰": (0xffd6e7, 0xf29ac0, "light pink house with a cat"),
    "e.privateex": (0x3fb5b0, 0x1f7a78, "can i have a teal house??"),
    "ELIZABETH cat": (0x5fc9c4, 0x2a8f8a, "small teal house"),
    "brittu": (0xf4f4f4, 0x2fb0b8, "big house thats white and teal"),
    "Ollie": (0x6fa8ff, 0x2f5fd0, "Can I have a blue house"),
    "felicia™": (0x8ab8ff, 0x3a6ee8, "can i have a blue house?"),
    "Ellis": (0x5a8fe0, 0x2a4fa8, "please can i have a house thats blue"),
    "will": (0x3ad0ff, 0x1a7ad0, "neon blue house next to stadium"),
    "Layla": (0x7dff5a, 0x3fbf2a, "Can I have a neon green house"),
    "Amber": (0x2fa86a, 0x1d6b44, "emerald green house"),
    "Lewis": (0x8fd17a, 0x4f9a3a, "Can I have a green house?"),
    "crisp": (0xa8e0c0, 0x3a9a6a, "glass green house"),
    "saskia": (0xc9b3f0, 0x8a6ad0, "Can i have a lavender house"),
    "Caydence": (0xe6c35a, 0xb8902a, "Can i live in a gold house"),
    "Melodyyy💗": (0xff3b3b, 0xb81d1d, "bright red house"),
    "ESSA": (0xc41e3a, 0x7a1020, "cherry red house"),
    "meowpoo": (0xf4f4f4, 0x8ab8ff, "pink and blue roof"),
    "ems": (0xffffff, 0x222222, "white with a black roof"),
}
BILLIONAIRES = ["megan_m74", "Lucie", "BoomBoom", "Mia", "Melisa:)", "ameliaspams🤍", "unknown_0915", "ADDISON",
                "⚜trampolining⚜", "EMILY", "Isla💋", "DEMIS SPAM", "Lylabrown🍒", "leyla☁️", "Henson", "itsrubez",
                "Yesujin", "Alaiya", "Miami", "Simeon", "L♡", "anna_3lizab3th", "Teruseee", "iona", "Lily",
                "armonie", "ivy", "rose⭐", "🤍Rosie", "BonFromVietnam0611", "T8!"]
PLAIN = ["Dagmar", "❄️Sophh", "IBA", "Jess (Julia's version)", "brooke💜", "Olivia", "anais♡", "Liisu", "ARI⭐",
         "Mia🤍", "~Rubes", "Marelle💗", "Emijinx", "eli", "cutie", "Lilyy xx", "Ava❣️", "*~Rose~*", "Natiii", "mima",
         "Joe", "izzy", "Sophies_spam", "dais", "Leah", "Aifleigh", "caitlinella", "???", "Charlotte", "Nubiaaaa",
         "laurettaprivaaaa", "x.pub.priscilla.x", "iyiesha", "sadie", "Sandeeee", "♡☆T♡☆", "swanccouture", "Player00",
         "Aiyannaxoxo22", "Els", "GRR", "JACOB", "lillyrose.priv", "safiya_S", "Penelope", "Maggie", "megan", "Tia <3",
         "HC", "🤍", "Isla⚽", "Georgia💗", "emii", "evelina", "zac x", "izzy (top floor)", "Rosie", "Djada✌",
         "Miami (dachshunds)", "spam", "josie", "Melisa", "Jessica💗", "jess_2026", "⛔", "ella:)", "Dylan", "chris_r125yzf",
         "D", "p.s", "Mavis", "Jaylinn", "Mollsan1320", "Ivy's_secret", "Charliee", "Sof", "Ketchup", "-Qurckz-",
         "K💗", "Emily-mai", "Bella", "Lexi", "sumssuperspam26", "LLR", "katiemccarron", "bea", "thora", "Sis👍",
         "Vilma", "eva", "Sienna", "💞", "Alicia", "absprivv", "Fallen Angel", "KARLA", "•Ava•", "eimear",
         "~francesca~", "A (Frozzie)", "Horizon", "Senna", "trashmouthtozier", "fisho_185", "HARV", "Kirki", "M🪽",
         "Kaion", "ty.rx", "Ye olde", "Nevie", "jess's spammmm", "Pufc_ethan1", "Amelia🎄", "savannah", "eloise",
         "priv💘", "ebonyyy", "😙", "crazy guy", "Duffer🇮🇪", "~amelia~", "ʚɞ", "Rosie Suddery"]
PLAIN = [p for p in PLAIN if p not in ("Miami (dachshunds)", "izzy (top floor)", "Melisa")]  # duplicates of others

# ---- plots for ordinary houses: outward from the entrance, avoiding used/reserved plots
reserved = {(25, 375), (-25, 375), (25, 325), (-25, 325), (-75, 375), (75, 375), (-75, 325), (-25, 25), (25, 25),
            (25, -25), (25, -75), (-75, -75), (-75, -25), (-75, 25)}
hill = [(x, z) for x in (175, 225, 275) for z in (375, 325, 275, 225, 175)]
plots = sorted([(x, z) for x in range(-375, 400, 50) for z in range(-375, 400, 50)
                if (x, z) not in reserved and (x, z) not in hill and not (125 <= x <= 325 and 125 <= z <= 425)],
               key=lambda p: (abs(p[0]) * 1.4 + (400 - p[1])))
slots = []
for (px, pz) in plots:
    for dz in (11, -1, -13):
        for dx in (-12, 0, 12):
            slots.append((px + dx, pz + dz))
# P5 (25, 275) already has two houses at (14,286) and (36,286): skip those slots
slots = [s for s in slots if s not in [(13, 286), (37, 286)] and not (abs(s[0] - 14) < 6 and abs(s[1] - 286) < 6) and not (abs(s[0] - 36) < 6 and abs(s[1] - 286) < 6)]

added = []
for name, kind, req, (px, pz), dx in SPECIAL:
    if name not in have:
        added.append({"name": name, "house": kind, "x": px + dx, "z": pz, "since_episode": 3, "comment": req})
k = 0
order = list(COLOURED.keys()) + PLAIN
random.shuffle(order)
for name in order:
    if name in have:
        continue
    x, z = slots[k]; k += 1
    e = {"name": name, "house": "house", "x": x, "z": z, "since_episode": 3}
    if name in COLOURED:
        w, r, req = COLOURED[name]; e.update(wall=w, roof=r, comment=req)
    else:
        e["roof"] = random.choice(ROOFS)
    added.append(e)
i = 0
for (hx, hz) in hill:
    for dx in (-9.5, 9.5):
        if i < len(BILLIONAIRES):
            added.append({"name": BILLIONAIRES[i], "house": "villa", "x": hx + dx, "z": hz - 2, "y": 3, "since_episode": 3, "district": "Billionaires' Hill"})
            i += 1
d["citizens"] += added
d.setdefault("buildings", [])
if not any(b["id"] == "cinema" for b in d["buildings"]):
    d["buildings"].append({"id": "cinema", "type": "cinema", "label": "CINEMA", "x": 25, "z": 25, "since_episode": 3, "won_vote": "Ep 2: Cinema 59%"})
    d["buildings"].append({"id": "billionaires_hill", "type": "district", "label": "BILLIONAIRES' HILL", "x": 225, "z": 275, "w": 150, "d": 250, "h": 3, "since_episode": 3})
for c in d["citizens"]:
    if c["name"] == "Tamara":
        c["extension"] = {"colour": 0xa64dff, "since_episode": 3, "request": "Might have to make an extension in neon purple"}
json.dump(d, open(STATE, "w"), indent=1, ensure_ascii=False)
print(f"added {len(added)} citizens (specials {len(SPECIAL)}, villas {i}); total {len(d['citizens'])}; slots used {k}")
