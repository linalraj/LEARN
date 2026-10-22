"""Turns a teacher's lecture file into a Level game: learning cards (with images) + Duolingo-style exercises.

Free AI providers, tried in this order (only the ones you configured are used):
  1. Google Gemini    free key from https://aistudio.google.com   ->  GEMINI_API_KEY
  2. Groq             free key from https://console.groq.com      ->  GROQ_API_KEY
  3. OpenRouter       free key from https://openrouter.ai          ->  OPENROUTER_API_KEY   (uses ":free" models)
  4. Ollama           free, runs on your own laptop (ollama pull qwen3:4b)
  5. Built-in offline generator: needs no key and no internet, always produces a playable game from the notes.
Put the keys in the file  learn/.env  (copy .env.example). Model names can be changed there too, because
providers rename their free models from time to time.

Images: pictures inside the teacher's PPTX / PDF / DOCX are used first (matched to the slide/page a card came
from). Cards without a picture get a free Wikipedia image found by a short search phrase.
Only the Python standard library is needed (PDF reading needs: pip install pypdf).
"""
import html
import json
import os
import random
import re
import shutil
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zipfile

from schema import LECTURE_SCHEMA, validate_lecture

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "LEARN-college-app/1.7 (education; contact: department admin)"


def load_env():
    """Read KEY=VALUE lines from learn/.env (and server/.env) into os.environ without overriding real env vars."""
    for p in (os.path.join(ROOT, ".env"), os.path.join(os.path.dirname(__file__), ".env")):
        if os.path.isfile(p):
            for line in open(p, encoding="utf-8", errors="ignore"):
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()

SYSTEM = (
    "You are an expert college teacher and instructional designer. You turn lecture notes into a short, engaging, "
    "learnable lesson like Duolingo and Green Scholar skill tools. Use ONLY facts that appear in the lecture notes; "
    "never add outside facts or numbers. Use simple English and short sentences. Return JSON only."
)

RULES = """Return ONE JSON object with this exact shape:
{
 "title": "short lecture title",
 "learn": {
  "cards": [ {"heading": "3-6 words", "text": "2-4 short sentences that teach one idea", "key": "one-sentence takeaway to remember",
              "image_query": "2-4 English words that would find a real photo or diagram of this idea", "source_unit": 3} ],
  "check": [ {"q": "question", "options": ["CORRECT answer", "wrong 1", "wrong 2"]} ],
  "order": ["step 1", "step 2", "step 3", "step 4"]
 },
 "game": [ ...exercises... ]
}
Rules:
- learn.cards: 5 to 7 cards in teaching order, each covering a different idea. source_unit = the [Slide/Page n] number the card came from (or omit).
- learn.check: 3 multiple-choice questions, exactly 3 options each, the FIRST option is the correct one.
- learn.order: 4 to 6 steps of a real process or sequence in the notes (if none, the main stages in teaching order).
- game: 12 exercises using at least 6 different types, mixed in this order of variety. Types:
  {"type":"match","pairs":[["term","short meaning"], ... 4 pairs]}
  {"type":"listen","answer":"one short sentence (6-12 words) from the notes","extra_words":["wrongword","wrongword"]}
  {"type":"bank","q":"Build the sentence","answer":"sentence of 6-12 words","extra_words":["wrongword","wrongword"]}
  {"type":"fill","q":"sentence with ___ for one key word","options":["right","wrong","wrong"],"answer":"right"}
  {"type":"type","q":"question with a one-word or number answer","answer":"word","accept":["other accepted spelling"]}
  {"type":"pick","q":"question","options":["a","b","c"],"correct_index":0}
  {"type":"speak","answer":"a short sentence (5-10 words) the student says aloud"}
  {"type":"tf","q":"a statement from the notes, or a slightly changed false version","is_true":true}
- Every exercise must be answerable from the notes. No trick questions. No two exercises should test the same fact."""


def build_prompt(title, source, limit):
    parts = []
    for u in source["units"]:
        parts.append(f"[{u['label']}]\n{u['text']}")
    notes = "\n\n".join(parts)[:limit]
    return f"Lecture title: {title}\n\n{RULES}\n\nLECTURE NOTES:\n{notes}"


# ---------------------------------------------------------------- providers
def _post(url, body, headers, timeout=120):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=dict({"Content-Type": "application/json", "User-Agent": UA}, **headers))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode('utf-8', 'ignore')[:200]}")


def call_gemini(system, user):
    key = os.environ["GEMINI_API_KEY"]
    models = [m.strip() for m in os.environ.get("GEMINI_MODEL", "gemini-2.5-flash,gemini-flash-latest,gemini-2.0-flash").split(",") if m.strip()]
    last = None
    for m in models:
        try:
            j = _post(f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent",
                      {"systemInstruction": {"parts": [{"text": system}]},
                       "contents": [{"role": "user", "parts": [{"text": user}]}],
                       "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"}},
                      {"x-goog-api-key": key})
            return "".join(p.get("text", "") for p in j["candidates"][0]["content"]["parts"])
        except Exception as e:   # wrong/retired model name, quota: try the next model name
            last = e
    raise last or RuntimeError("no Gemini model worked")


def _openai_style(url, key, model, system, user, json_mode, extra_headers=None):
    body = {"model": model, "temperature": 0.3, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    j = _post(url, body, dict({"Authorization": "Bearer " + key}, **(extra_headers or {})))
    return j["choices"][0]["message"]["content"]


def call_groq(system, user):
    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    return _openai_style("https://api.groq.com/openai/v1/chat/completions", os.environ["GROQ_API_KEY"], model, system, user, True)


def call_openrouter(system, user):
    models = [m.strip() for m in os.environ.get("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free,deepseek/deepseek-chat-v3-0324:free").split(",") if m.strip()]
    last = None
    for m in models:
        try:
            return _openai_style("https://openrouter.ai/api/v1/chat/completions", os.environ["OPENROUTER_API_KEY"], m, system, user, False,
                                 {"HTTP-Referer": "http://localhost", "X-Title": "LEARN"})
        except Exception as e:
            last = e
    raise last or RuntimeError("no OpenRouter model worked")


def call_ollama(system, user):
    body = {"model": os.environ.get("LEARN_MODEL", "qwen3:4b"), "stream": False, "think": False, "format": LECTURE_SCHEMA,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "options": {"temperature": 0.3, "num_ctx": 8192}}
    return _post(os.environ.get("OLLAMA_URL", "http://localhost:11434/api/chat"), body, {}, timeout=900)["message"]["content"]


def providers():
    out = []
    if os.environ.get("GEMINI_API_KEY"):
        out.append(("Gemini (free)", call_gemini, 24000))
    if os.environ.get("GROQ_API_KEY"):
        out.append(("Groq (free)", call_groq, 16000))
    if os.environ.get("OPENROUTER_API_KEY"):
        out.append(("OpenRouter (free)", call_openrouter, 16000))
    if os.environ.get("LEARN_USE_OLLAMA", "1") != "0":
        out.append(("Ollama (local)", call_ollama, 7000))
    return out


def extract_json(text):
    text = (text or "").strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.M).strip()
    a, b = text.find("{"), text.rfind("}")
    if a < 0 or b <= a:
        raise ValueError("no JSON object in the reply")
    return json.loads(text[a:b + 1])


def generate_lecture(title, source, tries=2, extra_providers=None):
    """Returns (lecture_dict, provider_name, notes). Always returns a lecture: if every AI fails, the offline generator runs."""
    notes = []
    for name, fn, limit in (extra_providers if extra_providers is not None else providers()):
        user = build_prompt(title, source, limit)
        for _ in range(tries):
            try:
                data = extract_json(fn(SYSTEM, user))
            except Exception as e:
                notes.append(f"{name}: {e}")
                break
            clean, errs = validate_lecture(data)
            if clean:
                return clean, name, notes
            notes.append(f"{name}: {'; '.join(errs)}")
            user += "\n\nYour previous JSON had these problems: " + "; ".join(errs) + ". Return the complete corrected JSON."
    return offline_lecture(title, source), "Built-in generator", notes


# ---------------------------------------------------------------- reading the teacher's file
IMG_EXT = (".png", ".jpg", ".jpeg", ".gif", ".webp")


def _save_image(media_dir, name, data):
    if len(data) < 6000 or len(data) > 6_000_000:      # skip icons/logos and huge scans
        return None
    os.makedirs(media_dir, exist_ok=True)
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    with open(os.path.join(media_dir, safe), "wb") as f:
        f.write(data)
    return safe


def _paras(xml, p_tag, t_tag):
    out = []
    for p in re.split(rf"</{p_tag}>", xml):
        t = "".join(html.unescape(x) for x in re.findall(rf"<{t_tag}[^>]*>([^<]*)</{t_tag}>", p)).strip()
        if t:
            out.append(t)
    return out


def _convert_legacy_office(path):
    """Convert legacy .ppt/.doc files to .pptx/.docx when LibreOffice is installed."""
    ext = os.path.splitext(path)[1].lower()
    target_ext = {".ppt": "pptx", ".doc": "docx"}.get(ext)
    if not target_ext:
        return path
    converter = shutil.which("libreoffice") or shutil.which("soffice")
    if not converter:
        raise RuntimeError(
            f"This is an older {ext} file. This server cannot read it directly. "
            f"Install LibreOffice on the computer running LEARN, or save the file as .{target_ext} and upload it again."
        )
    outdir = tempfile.mkdtemp(prefix="learn_convert_")
    try:
        result = subprocess.run(
            [converter, "--headless", "--convert-to", target_ext, "--outdir", outdir, path],
            capture_output=True, text=True, timeout=60
        )
        converted = os.path.join(outdir, os.path.splitext(os.path.basename(path))[0] + "." + target_ext)
        if result.returncode != 0 or not os.path.isfile(converted):
            detail = (result.stderr or result.stdout or "LibreOffice did not produce a converted file").strip()
            raise RuntimeError(f"Could not convert legacy {ext} file: {detail[:240]}")
        # Keep the converted file beside uploads so the background worker can read it after this helper returns.
        dest = os.path.splitext(path)[0] + "." + target_ext
        shutil.copy2(converted, dest)
        return dest
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"Converting this legacy {ext} file took too long. Save it as .{target_ext} and upload it again.")
    finally:
        shutil.rmtree(outdir, ignore_errors=True)


def read_source(path, media_dir):
    """-> {"units":[{"n","label","text","images":[file names in media_dir]}], "images":[...]}. Raises RuntimeError with a plain message."""
    path = _convert_legacy_office(path)
    p = path.lower()
    units, all_images = [], []
    if p.endswith((".txt", ".md")):
        raw = open(path, encoding="utf-8", errors="ignore").read()
        blocks = [b.strip() for b in re.split(r"\n\s*\n", raw) if b.strip()]
        for i in range(0, len(blocks), 3):
            units.append({"n": len(units) + 1, "label": f"Part {len(units) + 1}", "text": "\n".join(blocks[i:i + 3]), "images": []})
    elif p.endswith(".pptx"):
        z = zipfile.ZipFile(path)
        slides = sorted((int(re.search(r"slide(\d+)\.xml", n).group(1)), n) for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n))
        saved = {}
        for n, name in slides:
            text = "\n".join(_paras(z.read(name).decode("utf-8", "ignore"), "a:p", "a:t"))
            imgs = []
            rel = f"ppt/slides/_rels/slide{n}.xml.rels"
            if rel in z.namelist():
                for tgt in re.findall(r'Target="\.\./media/([^"]+)"', z.read(rel).decode("utf-8", "ignore")):
                    if tgt.lower().endswith(IMG_EXT):
                        if tgt not in saved:
                            saved[tgt] = _save_image(media_dir, f"s{n}_{tgt}", z.read("ppt/media/" + tgt))
                        if saved[tgt]:
                            imgs.append(saved[tgt])
            units.append({"n": n, "label": f"Slide {n}", "text": text, "images": imgs})
            all_images += [i for i in imgs if i not in all_images]
    elif p.endswith(".docx"):
        z = zipfile.ZipFile(path)
        paras = _paras(z.read("word/document.xml").decode("utf-8", "ignore"), "w:p", "w:t")
        for i in range(0, len(paras), 6):
            units.append({"n": len(units) + 1, "label": f"Part {len(units) + 1}", "text": "\n".join(paras[i:i + 6]), "images": []})
        for name in z.namelist():
            if name.startswith("word/media/") and name.lower().endswith(IMG_EXT):
                s = _save_image(media_dir, os.path.basename(name), z.read(name))
                if s:
                    all_images.append(s)
    elif p.endswith(".pdf"):
        try:
            from pypdf import PdfReader
        except ImportError:
            raise RuntimeError("PDF reading needs pypdf: run  python -m pip install pypdf")
        for i, pg in enumerate(PdfReader(path).pages, 1):
            imgs = []
            try:
                for k, im in enumerate(pg.images):
                    if str(im.name).lower().endswith(IMG_EXT):
                        s = _save_image(media_dir, f"p{i}_{k}_{im.name}", im.data)
                        if s:
                            imgs.append(s)
            except Exception:
                pass
            units.append({"n": i, "label": f"Page {i}", "text": (pg.extract_text() or "").strip(), "images": imgs})
            all_images += imgs
    else:
        raise RuntimeError("Unsupported file type. Use .pptx, .pdf, .docx, .txt or .md (save old .ppt/.doc files as .pptx/.docx first).")
    units = [u for u in units if u["text"].strip()]
    if sum(len(u["text"]) for u in units) < 150:
        raise RuntimeError("Upload received, but no readable lecture text was extracted. If this is a scanned/image-only PDF, run OCR first; if it is a slide deck, select text in a slide and confirm it can be copied. Supported formats: PPT/PPTX, DOC/DOCX, PDF, TXT, MD.")
    return {"units": units, "images": all_images}


# ---------------------------------------------------------------- images for cards
def wiki_image(query, media_dir):
    """Free picture from Wikipedia for a short search phrase. -> (file name, credit) or (None, None). Never raises."""
    try:
        q = urllib.parse.urlencode({"action": "query", "generator": "search", "gsrsearch": query, "gsrlimit": 4, "gsrnamespace": 0,
                                    "prop": "pageimages", "piprop": "thumbnail", "pithumbsize": 640, "format": "json"})
        req = urllib.request.Request("https://en.wikipedia.org/w/api.php?" + q, headers={"User-Agent": UA})
        pages = json.loads(urllib.request.urlopen(req, timeout=8).read()).get("query", {}).get("pages", {})
        for pg in sorted(pages.values(), key=lambda x: x.get("index", 99)):
            th = pg.get("thumbnail", {}).get("source")
            if th and th.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png")):
                data = urllib.request.urlopen(urllib.request.Request(th, headers={"User-Agent": UA}), timeout=10).read()
                name = "wiki_" + re.sub(r"[^a-z0-9]+", "_", query.lower())[:40] + os.path.splitext(th.split("?")[0])[1]
                saved = _save_image(media_dir, name, data) if len(data) >= 3000 else None
                if saved:
                    return saved, "Image: Wikipedia — " + pg.get("title", "")
    except Exception:
        pass
    return None, None


def attach_images(lec, source, media_dir, url_prefix, use_wikipedia=True):
    """Give each card a picture: from the teacher's own slide/page first, then any unused picture, then Wikipedia."""
    by_unit = {u["n"]: list(u["images"]) for u in source["units"]}
    used = set()
    spare = [i for i in source["images"]]
    for c in lec["learn"]["cards"]:
        pic, credit = None, ""
        for im in by_unit.get(c.get("source_unit"), []):
            if im not in used:
                pic, credit = im, "From your lecture file"
                break
        if not pic:
            for im in spare:
                if im not in used and c.get("source_unit") is None:
                    pic, credit = im, "From your lecture file"
                    break
        if not pic and use_wikipedia and c.get("image_query"):
            pic, credit = wiki_image(c["image_query"], media_dir)
        if pic:
            used.add(pic)
            c["image"], c["credit"] = url_prefix + pic, credit
    return lec


# ---------------------------------------------------------------- offline generator (no AI, no internet)
STOP = set("""the a an and or of to in on for with is are was were be been by as at from that this these those it its their there which who
whom whose into than then also can may will shall such using used use more most other some any each per via not no but if so we you they he
she our your his her them i have has had do does did about over under between during after before while when where what how why all both
only very much many one two three first second third called known given following include includes including""".split())


def _sentences(units, title=""):
    out = []
    tl = " ".join(title.lower().split())
    for ui, u in enumerate(units):
        lines = re.split(r"[\r\n]+", u["text"])
        if ui == 0 and len(lines) > 3 and not re.search(r"[.!?]$", lines[0].strip()):
            lines = lines[1:]                                   # first line is the lecture heading
        for line in lines:
            if tl and " ".join(line.lower().split()) == tl:
                continue
            line = re.sub(r"^[\s\-\u2022\u25aa\u25cf*•·\d.)(]+", "", line).strip()
            for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", line):
                s = " ".join(s.split()).rstrip(" ;:,")
                if 4 <= len(s.split()) <= 38 and 22 <= len(s) <= 260 and s not in [x[0] for x in out]:
                    out.append((s, u["n"]))
    return out


def _words(s):
    return re.findall(r"[A-Za-z][A-Za-z\-]{3,}", s)


def _terms(sents):
    cnt = {}
    for s, _ in sents:
        for w in set(x.lower() for x in _words(s)):
            if w not in STOP and len(w) >= 5:
                cnt[w] = cnt.get(w, 0) + 1
    return sorted(cnt, key=lambda w: (-cnt[w], -len(w), w))


DEF = re.compile(r"^(?:an?|the)?\s*([A-Za-z][A-Za-z\- ]{2,34}?)\s+(?:is|are|means|refers to|is defined as|is called)\s+(?:an?|the)?\s*(.{12,220})$", re.I)


def _defs(sents):
    """'X is a Y ...' sentences -> [(term, short meaning, full sentence)]"""
    out, seen = [], set()
    for s, _ in sents:
        m = DEF.match(s)
        if not m:
            continue
        term = m.group(1).strip()
        if len(term.split()) > 4 or term.split()[0].lower() in STOP or term.lower() in seen:
            continue
        d = re.split(r",|;| and | which | where | that | whose ", m.group(2).rstrip("."), maxsplit=1)
        d = d[0] if len(d[0].split()) >= 3 else m.group(2).rstrip(".")
        w = d.split()[:9]
        while len(w) > 3 and w[-1].lower() in STOP | {"at", "of", "with", "the", "a", "an", "to", "in", "on"}:
            w.pop()
        d = " ".join(w)
        seen.add(term.lower())
        out.append((term[0].upper() + term[1:], d, s))
    return out


def _blank(sentence, term):
    pat = re.compile(r"\b" + re.escape(term) + r"\b", re.I)
    return pat.sub("___", sentence, count=1) if pat.search(sentence) else None


def _swap(sentence, a, b):
    pat = re.compile(r"\b" + re.escape(a) + r"\b", re.I)
    return pat.sub(b, sentence, count=1) if pat.search(sentence) else None


def offline_lecture(title, source):
    """Builds a valid lecture straight from the notes using simple language rules. Used when no AI answers."""
    sents = _sentences(source["units"], title)
    if len(sents) < 8:
        raise RuntimeError("Not enough sentences in the file to build a game (need at least 8 lines of notes).")
    rnd = random.Random(sum(ord(c) for c in title))
    terms = _terms(sents)[:40]
    defs = _defs(sents)
    if len(terms) < 6:
        raise RuntimeError("The notes have too few distinct key words to build a game.")
    topic = terms[0]
    # ---- cards
    n_cards = max(4, min(7, len(sents) // 3))
    size = -(-len(sents) // n_cards)
    chunks = [sents[i:i + size] for i in range(0, len(sents), size)][:n_cards]
    used_heads, cards = set(), []
    for ch in chunks:
        dterm = next((d[0] for d in defs if any(d[2] == x for x, _ in ch) and d[0].lower() not in used_heads), None)
        cand = [t for t in _terms(ch) if t not in used_heads] or [t for t in terms if t not in used_heads] or ["overview"]
        head = dterm.lower() if dterm else cand[0]
        used_heads.add(head)
        key = min((s for s, _ in ch if len(s.split()) >= 6), key=len, default=ch[0][0])
        cards.append({"heading": head.title(), "text": " ".join(s for s, _ in ch[:3]), "key": key,
                      "image_query": f"{head} {topic}".strip(), "source_unit": ch[0][1]})
    # ---- term -> sentence index
    def with_term(t, skip=()):
        return [s for s, _ in sents if re.search(r"\b" + re.escape(t) + r"\b", s, re.I) and s not in skip]

    # ---- check questions (first option correct)
    check, used_s = [], set()
    for i, (term, meaning, _) in enumerate(defs[:3]):
        others = [d[1] for j, d in enumerate(defs) if j != i]
        if len(others) >= 2:
            check.append({"q": f"Which one describes {term}?", "options": [meaning, others[0], others[1]]})
            used_s.add(_)
    for t in ([] if len(check) == 3 else terms):
        for s in with_term(t, used_s)[:1]:
            others = [x for x in terms if x != t and not re.search(r"\b" + x + r"\b", s, re.I)]
            if len(others) >= 2 and _blank(s, t):
                check.append({"q": "Complete the statement: " + _blank(s, t), "options": [t, others[rnd.randrange(len(others))], others[rnd.randrange(len(others))]]})
                used_s.add(s)
        if len(check) == 3:
            break
    for c in check:                                   # make sure the 3 options differ
        o = c["options"]
        pool = [x for x in terms if x not in o]
        while len(set(o)) < 3 and pool:
            o[o.index(next(x for x in o if o.count(x) > 1))] = pool.pop(0)
    # ---- order
    seq = [re.sub(r"^(first|second|third|then|next|after that|finally|lastly|step \d+)[,:]?\s*", "", s, flags=re.I) for s, _ in sents
           if re.match(r"^(first|second|third|then|next|after that|finally|lastly|step \d+)\b", s, re.I)]
    order = [(x[:1].upper() + x[1:])[:110] for x in seq[:6]] if len(seq) >= 4 else [c["heading"] for c in cards][:5]
    if len(order) < 4:
        order = [c["heading"] for c in cards][:5]
    # ---- game
    short = sorted([s for s, _ in sents if 6 <= len(s.split()) <= 14], key=len)
    mid = [s for s, _ in sents if 7 <= len(s.split()) <= 18]
    game = []

    def extras(s):
        return [t for t in terms if not re.search(r"\b" + t + r"\b", s, re.I)][:2]

    pairs = [[d[0], d[1]] for d in defs[:4]]
    for t in ([] if len(pairs) >= 3 else terms):
        s = next(iter(with_term(t)), None)
        if s:
            rest = re.sub(r"\b" + re.escape(t) + r"\b", "", s, flags=re.I).split()
            right = " ".join(rest[:7]).strip(" ,;:.-")
            if len(right) > 8:
                pairs.append([t.title(), right])
        if len(pairs) == 4:
            break
    if len(pairs) >= 3:
        game.append({"type": "match", "pairs": pairs})
    if short:
        game.append({"type": "listen", "answer": short[0], "extra_words": extras(short[0])})
    fills = []
    for t in terms[2:14]:
        s = next(iter(with_term(t)), None)
        if s and _blank(s, t) and len(s.split()) <= 22:
            o = [t] + [x for x in terms if x != t and not re.search(r"\b" + x + r"\b", s, re.I)][:2]
            rnd.shuffle(o)
            fills.append({"type": "fill", "q": _blank(s, t), "options": o, "answer": t})
    game += fills[:3]
    picks = []
    for i, (term, meaning, _) in enumerate(defs):
        others = [d[1] for j, d in enumerate(defs) if j != i]
        if len(others) >= 2 and len(picks) < 2 and i % 2 == 1:
            o = [meaning, others[0], others[1]]
            rnd.shuffle(o)
            picks.append({"type": "pick", "q": f"Which one describes {term}?", "options": o, "correct_index": o.index(meaning)})
    for i in range(0, len(mid) - 2, 3) if len(picks) < 2 else []:
        a = mid[i]
        wrong = []
        for b in mid[i + 1:i + 6]:
            tb = next((t for t in terms if re.search(r"\b" + t + r"\b", b, re.I)), None)
            ta = next((t for t in terms if re.search(r"\b" + t + r"\b", a, re.I)), None)
            if ta and tb and ta != tb and _swap(a, ta, tb):
                wrong.append(_swap(a, ta, tb))
            if len(wrong) == 2:
                break
        if len(wrong) == 2:
            o = [a] + wrong
            rnd.shuffle(o)
            picks.append({"type": "pick", "q": "Which statement is correct?", "options": o, "correct_index": o.index(a)})
    game += picks[:2]
    if len(short) > 1:
        game.append({"type": "bank", "q": "Build the sentence", "answer": short[1], "extra_words": extras(short[1])})
    for i, t in enumerate(terms[:10]):
        s = next(iter(with_term(t)), None)
        if s and _blank(s, t) and i % 2 == 0 and len(game) < 20:
            tf_true = i % 4 == 0
            other = next((x for x in terms if x != t and not re.search(r"\b" + x + r"\b", s, re.I)), None)
            stmt = s if tf_true else (_swap(s, t, other) if other else None)
            if stmt:
                game.append({"type": "tf", "q": stmt, "is_true": tf_true})
        if sum(1 for g in game if g["type"] == "tf") == 2:
            break
    typ = 0
    for term, meaning, _ in defs:
        if len(term.split()) == 1 and typ < 1:
            game.append({"type": "type", "q": f"Type the term for: {meaning}", "answer": term, "accept": [term.lower()]})
            typ += 1
    for t in terms[3:20]:
        s = next(iter(with_term(t)), None)
        if s and _blank(s, t) and len(t) <= 14 and len(s.split()) <= 20 and not any(g.get("answer") == t for g in game):
            game.append({"type": "type", "q": "Type the missing word: " + _blank(s, t), "answer": t, "accept": []})
            typ += 1
        if typ == 2:
            break
    if len(short) > 2:
        game.append({"type": "speak", "answer": short[2]})
    # mix the order so neighbours differ, like Duolingo
    mixed, pool = [], game[:]
    while pool:
        nxt = next((g for g in pool if not mixed or g["type"] != mixed[-1]["type"]), pool[0])
        mixed.append(nxt)
        pool.remove(nxt)
    lec = {"title": title, "learn": {"cards": cards, "check": check, "order": order}, "game": mixed[:14]}
    clean, errs = validate_lecture(lec)
    if not clean:
        raise RuntimeError("The notes were too short to make a full game: " + "; ".join(errs))
    return clean
