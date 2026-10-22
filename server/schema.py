"""The fixed format of one generated lecture (Level game), a lenient validator that repairs small AI mistakes,
and the converter to the arrays the app plays (js/lesson.js).

  learn.cards  4-8 learning cards (heading, text, key idea, optional image)
  learn.check  3-4 skill-check questions (FIRST option is the correct one; the app shuffles)
  learn.order  4-6 steps to put in order
  game         10-14 Duolingo-style exercises of 8 types:
               match, listen, bank, fill, type, pick, speak, tf (true/false)
Plain Python, no third-party libraries.
"""

GAME_TYPES = ["match", "listen", "bank", "fill", "type", "pick", "speak", "tf"]

LECTURE_SCHEMA = {
    "type": "object",
    "required": ["title", "learn", "game"],
    "properties": {
        "title": {"type": "string"},
        "learn": {"type": "object", "required": ["cards", "check", "order"], "properties": {
            "cards": {"type": "array", "minItems": 4, "maxItems": 8, "items": {
                "type": "object", "required": ["heading", "text", "key"],
                "properties": {"heading": {"type": "string"}, "text": {"type": "string"}, "key": {"type": "string"},
                               "image_query": {"type": "string"}, "source_unit": {"type": "integer"}}}},
            "check": {"type": "array", "minItems": 3, "maxItems": 4, "items": {
                "type": "object", "required": ["q", "options"],
                "properties": {"q": {"type": "string"}, "options": {"type": "array", "minItems": 3, "maxItems": 3, "items": {"type": "string"}}}}},
            "order": {"type": "array", "minItems": 4, "maxItems": 6, "items": {"type": "string"}}}},
        "game": {"type": "array", "minItems": 10, "maxItems": 14, "items": {
            "type": "object", "required": ["type"],
            "properties": {
                "type": {"type": "string", "enum": GAME_TYPES},
                "q": {"type": "string"}, "answer": {"type": "string"},
                "options": {"type": "array", "items": {"type": "string"}},
                "extra_words": {"type": "array", "items": {"type": "string"}},
                "pairs": {"type": "array", "items": {"type": "array", "items": {"type": "string"}}},
                "accept": {"type": "array", "items": {"type": "string"}},
                "correct_index": {"type": "integer"}, "is_true": {"type": "boolean"}}}},
    },
}


def _s(x):
    return isinstance(x, str) and x.strip() != ""


def _clip(x, n):
    x = " ".join(str(x).split())
    return x if len(x) <= n else x[: n - 1].rstrip() + "…"


def normalise(d):
    """Repair small, harmless problems in AI output (extra items, missing optional fields). Returns a new dict or None."""
    if not isinstance(d, dict):
        return None
    L = d.get("learn") if isinstance(d.get("learn"), dict) else {}
    cards = []
    for c in (L.get("cards") or [])[:8]:
        if isinstance(c, dict) and _s(c.get("heading")) and _s(c.get("text")):
            key = c.get("key") if _s(c.get("key")) else c["text"].split(". ")[0]
            cards.append({"heading": _clip(c["heading"], 70), "text": _clip(c["text"], 520), "key": _clip(key, 200),
                          "image_query": _clip(c.get("image_query") or "", 60),
                          "source_unit": c.get("source_unit") if isinstance(c.get("source_unit"), int) else None})
    check = []
    for c in (L.get("check") or [])[:4]:
        if isinstance(c, dict) and _s(c.get("q")) and isinstance(c.get("options"), list):
            opts = [_clip(o, 120) for o in c["options"] if _s(o)][:3]
            if len(opts) == 3:
                check.append({"q": _clip(c["q"], 220), "options": opts})
    order = [_clip(o, 120) for o in (L.get("order") or []) if _s(o)][:6]
    game = []
    for g in (d.get("game") or [])[:14]:
        if not isinstance(g, dict):
            continue
        k = g.get("type")
        if k not in GAME_TYPES:
            continue
        e = {"type": k}
        for f in ("q", "answer"):
            if _s(g.get(f)):
                e[f] = _clip(g[f], 240)
        for f in ("options", "extra_words", "accept"):
            if isinstance(g.get(f), list):
                e[f] = [_clip(x, 80) for x in g[f] if _s(x)]
        if isinstance(g.get("pairs"), list):
            e["pairs"] = [[_clip(a, 80), _clip(b, 120)] for a, b in (p for p in g["pairs"] if isinstance(p, list) and len(p) == 2 and _s(p[0]) and _s(p[1]))][:5]
        if isinstance(g.get("correct_index"), int):
            e["correct_index"] = g["correct_index"]
        if isinstance(g.get("is_true"), bool):
            e["is_true"] = g["is_true"]
        game.append(e)
    return {"title": _clip(d.get("title") or "Lecture", 120), "learn": {"cards": cards, "check": check, "order": order}, "game": game}


def validate_lecture(d):
    """Return (clean_dict, errors). clean_dict is None when errors is not empty."""
    d = normalise(d)
    if d is None:
        return None, ["response is not a JSON object"]
    errs = []
    L = d["learn"]
    if len(L["cards"]) < 4:
        errs.append("learn.cards needs 4 to 8 cards with heading, text, key")
    if len(L["check"]) < 3:
        errs.append("learn.check needs 3 questions with exactly 3 options (first option = correct)")
    if not (4 <= len(L["order"]) <= 6):
        errs.append("learn.order needs 4 to 6 steps")
    game, good, kinds = d["game"], [], set()
    for i, g in enumerate(game):
        k = g["type"]
        ok = False
        if k == "match":
            ok = len(g.get("pairs") or []) >= 3
        elif k in ("listen", "speak"):
            ok = _s(g.get("answer")) and 3 <= len(g["answer"].split()) <= 20
        elif k == "bank":
            ok = _s(g.get("q")) and _s(g.get("answer")) and 3 <= len(g["answer"].split()) <= 20
        elif k == "fill":
            o = g.get("options") or []
            ok = _s(g.get("q")) and "___" in g["q"] and len(o) >= 2 and g.get("answer") in o
        elif k == "type":
            ok = _s(g.get("q")) and _s(g.get("answer")) and len(g["answer"].split()) <= 4
        elif k == "pick":
            o, ci = g.get("options") or [], g.get("correct_index")
            ok = _s(g.get("q")) and len(o) >= 2 and isinstance(ci, int) and 0 <= ci < len(o)
        elif k == "tf":
            ok = _s(g.get("q")) and isinstance(g.get("is_true"), bool)
        if ok:
            good.append(g)
            kinds.add(k)
    d["game"] = good
    if len(good) < 8:
        errs.append(f"game needs at least 8 valid exercises (found {len(good)})")
    if len(kinds) < 5:
        errs.append(f"game must use at least 5 different exercise types (found {len(kinds)})")
    return (None, errs) if errs else (d, [])


def to_app_format(d):
    """Convert a validated lecture into the arrays the app plays: LRN (learning part) and LES (game)."""
    L = d["learn"]
    lrn = {"t": d["title"],
           "c": [[c["heading"], c["text"], c["key"], c.get("image") or "", c.get("credit") or ""] for c in L["cards"]],
           "s": [[c["q"], c["options"]] for c in L["check"]],   # first option is correct
           "o": L["order"]}
    les = []
    for g in d["game"]:
        k = g["type"]
        if k == "match":
            les.append({"k": "match", "p": g["pairs"]})
        elif k == "listen":
            les.append({"k": "listen", "a": g["answer"], "x": g.get("extra_words", [])})
        elif k == "bank":
            les.append({"k": "bank", "q": g["q"], "a": g["answer"], "x": g.get("extra_words", [])})
        elif k == "fill":
            les.append({"k": "fill", "q": g["q"], "o": g["options"], "a": g["answer"]})
        elif k == "type":
            acc = [g["answer"].lower()] + [a.lower() for a in g.get("accept", [])]
            les.append({"k": "type", "q": g["q"], "a": acc})
        elif k == "pick":
            les.append({"k": "pick", "q": g["q"], "o": g["options"], "a": g["correct_index"]})
        elif k == "speak":
            les.append({"k": "speak", "a": g["answer"]})
        elif k == "tf":
            les.append({"k": "tf", "q": g["q"], "a": bool(g["is_true"])})
    return {"LRN": lrn, "LES": les}
