"""SQLite database (file: learn.db) using only Python's standard library."""
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
import datetime

DB_PATH = os.environ.get("LEARN_DB", os.path.join(os.path.dirname(__file__), "learn.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, pw_hash TEXT NOT NULL,
  name TEXT NOT NULL, id_number TEXT, phone TEXT, role TEXT NOT NULL CHECK(role IN('student','staff','admin')),
  created REAL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created REAL);
-- one row per lecture level. status: draft (AI made it) -> approved (teacher checked it)
CREATE TABLE IF NOT EXISTS lectures(
  id INTEGER PRIMARY KEY, course TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN('T','P')), idx INTEGER NOT NULL,
  title TEXT, notes_file TEXT, content_json TEXT, status TEXT NOT NULL DEFAULT 'none', updated REAL,
  UNIQUE(course, kind, idx));
-- how many levels faculty has opened per course (matches the app's S.op)
CREATE TABLE IF NOT EXISTS opened(course TEXT NOT NULL, kind TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(course, kind));
CREATE TABLE IF NOT EXISTS progress(user_id INTEGER NOT NULL, course TEXT NOT NULL, kind TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, points INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id, course, kind));
-- weekly XP and Duolingo-style leagues
CREATE TABLE IF NOT EXISTS xp(user_id INTEGER NOT NULL, week TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id, week));
CREATE TABLE IF NOT EXISTS league(user_id INTEGER PRIMARY KEY, level INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS league_result(user_id INTEGER NOT NULL, week TEXT NOT NULL, rank INTEGER, from_level INTEGER, to_level INTEGER, PRIMARY KEY(user_id, week));
CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS doubts(
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, course TEXT, level TEXT, text TEXT NOT NULL,
  reply TEXT, replied_by INTEGER, created REAL, replied REAL);
"""


def db():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    return c


def init_db():
    with db() as c:
        c.executescript(SCHEMA)


# ---- passwords & sessions ----
def hash_pw(pw, salt=None):
    salt = salt or secrets.token_bytes(16)
    h = hashlib.scrypt(pw.encode(), salt=salt, n=2 ** 14, r=8, p=1)
    return salt.hex() + "$" + h.hex()


def check_pw(pw, stored):
    salt, h = stored.split("$")
    return hmac.compare_digest(hash_pw(pw, bytes.fromhex(salt)).split("$")[1], h)


def create_user(email, pw, name, id_number, phone, role):
    with db() as c:
        try:
            cur = c.execute("INSERT INTO users(email,pw_hash,name,id_number,phone,role,created) VALUES(?,?,?,?,?,?,?)",
                            (email.lower(), hash_pw(pw), name.upper(), id_number, phone, role, time.time()))
        except sqlite3.IntegrityError:
            return None
        return cur.lastrowid


def login(email, pw):
    with db() as c:
        u = c.execute("SELECT * FROM users WHERE email=?", (email.lower(),)).fetchone()
        if not u or not check_pw(pw, u["pw_hash"]):
            return None, None
        tok = secrets.token_urlsafe(32)
        c.execute("INSERT INTO sessions(token,user_id,created) VALUES(?,?,?)", (tok, u["id"], time.time()))
        return tok, dict(u)


def user_for_token(tok):
    if not tok:
        return None
    with db() as c:
        r = c.execute("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?", (tok,)).fetchone()
        return dict(r) if r else None


# ---- lectures ----
def save_lecture(course, kind, idx, title=None, notes_file=None, content=None, status=None):
    with db() as c:
        c.execute("INSERT OR IGNORE INTO lectures(course,kind,idx) VALUES(?,?,?)", (course, kind, idx))
        if title is not None: c.execute("UPDATE lectures SET title=? WHERE course=? AND kind=? AND idx=?", (title, course, kind, idx))
        if notes_file is not None: c.execute("UPDATE lectures SET notes_file=? WHERE course=? AND kind=? AND idx=?", (notes_file, course, kind, idx))
        if content is not None: c.execute("UPDATE lectures SET content_json=? WHERE course=? AND kind=? AND idx=?", (json.dumps(content), course, kind, idx))
        if status is not None: c.execute("UPDATE lectures SET status=? WHERE course=? AND kind=? AND idx=?", (status, course, kind, idx))
        c.execute("UPDATE lectures SET updated=? WHERE course=? AND kind=? AND idx=?", (time.time(), course, kind, idx))


def get_lecture(course, kind, idx):
    with db() as c:
        r = c.execute("SELECT * FROM lectures WHERE course=? AND kind=? AND idx=?", (course, kind, idx)).fetchone()
        if not r: return None
        d = dict(r)
        d["content"] = json.loads(d.pop("content_json")) if d["content_json"] else None
        return d


# ---- opened levels, progress, doubts ----
def get_opened():
    with db() as c:
        out = {}
        for r in c.execute("SELECT * FROM opened"):
            out.setdefault(r["course"], [0, 0])[0 if r["kind"] == "T" else 1] = r["count"]
        return out


def set_opened(course, kind, count):
    with db() as c:
        c.execute("INSERT INTO opened(course,kind,count) VALUES(?,?,?) ON CONFLICT(course,kind) DO UPDATE SET count=excluded.count", (course, kind, count))


def get_progress(uid):
    with db() as c:
        out = {"pr": {}, "pts": 0}
        for r in c.execute("SELECT * FROM progress WHERE user_id=?", (uid,)):
            out["pr"].setdefault(r["course"], [0, 0])[0 if r["kind"] == "T" else 1] = r["done"]
            out["pts"] += r["points"]
        return out


def set_progress(uid, course, kind, done, points):
    with db() as c:
        c.execute("""INSERT INTO progress(user_id,course,kind,done,points) VALUES(?,?,?,?,?)
                     ON CONFLICT(user_id,course,kind) DO UPDATE SET done=MAX(done,excluded.done), points=MAX(points,excluded.points)""",
                  (uid, course, kind, done, points))


def add_doubt(uid, course, level, text):
    with db() as c:
        return c.execute("INSERT INTO doubts(user_id,course,level,text,created) VALUES(?,?,?,?,?)", (uid, course, level, text, time.time())).lastrowid


def list_doubts(uid=None):
    with db() as c:
        q = "SELECT d.*, u.name AS student FROM doubts d JOIN users u ON u.id=d.user_id"
        rows = c.execute(q + (" WHERE d.user_id=?" if uid else "") + " ORDER BY d.created DESC", (uid,) if uid else ()).fetchall()
        return [dict(r) for r in rows]


def reply_doubt(did, staff_id, text):
    with db() as c:
        return c.execute("UPDATE doubts SET reply=?, replied_by=?, replied=? WHERE id=?", (text, staff_id, time.time(), did)).rowcount


# ---- weekly XP and leagues (same rules as Duolingo) ----
# 10 leagues; groups of up to 30 students in the same league compete for a week (Monday to Sunday).
# The top 10 with some XP move up one league; the bottom 5 move down (only in groups of 15 or more, and never below Bronze).
LEAGUES = ["Bronze", "Silver", "Gold", "Sapphire", "Ruby", "Emerald", "Amethyst", "Pearl", "Obsidian", "Diamond"]
GROUP_SIZE, PROMOTE, DEMOTE = 30, 10, 5


def week_start(d=None):
    d = d or datetime.date.today()
    return (d - datetime.timedelta(days=d.weekday())).isoformat()


def add_xp(uid, amount):
    with db() as c:
        c.execute("INSERT INTO xp(user_id,week,xp) VALUES(?,?,?) ON CONFLICT(user_id,week) DO UPDATE SET xp=xp+excluded.xp", (uid, week_start(), amount))


def _levels(c):
    rows = c.execute("SELECT u.id, COALESCE(l.level,0) AS level FROM users u LEFT JOIN league l ON l.user_id=u.id WHERE u.role='student' ORDER BY u.id").fetchall()
    return [(r["id"], r["level"]) for r in rows]


def _groups(members):
    """members: [(uid, level)] -> {level: [[uid,...], ...]} in chunks of GROUP_SIZE"""
    by = {}
    for uid, lv in members:
        by.setdefault(lv, []).append(uid)
    return {lv: [ids[i:i + GROUP_SIZE] for i in range(0, len(ids), GROUP_SIZE)] for lv, ids in by.items()}


def _settle(c):
    cur = week_start()
    r = c.execute("SELECT v FROM meta WHERE k='settled'").fetchone()
    if r and r["v"] == cur:
        return
    last = week_start(datetime.date.today() - datetime.timedelta(days=7))
    xp = {x["user_id"]: x["xp"] for x in c.execute("SELECT user_id,xp FROM xp WHERE week=?", (last,))}
    for lv, groups in _groups(_levels(c)).items():
        for g in groups:
            ranked = sorted(g, key=lambda u: (-xp.get(u, 0), u))
            for i, uid in enumerate(ranked, 1):
                new = lv
                if xp.get(uid, 0) > 0 and i <= PROMOTE and lv < len(LEAGUES) - 1:
                    new = lv + 1
                elif lv > 0 and len(ranked) >= 15 and i > len(ranked) - DEMOTE:
                    new = lv - 1
                c.execute("INSERT INTO league(user_id,level) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET level=excluded.level", (uid, new))
                if xp.get(uid, 0) > 0:
                    c.execute("INSERT OR REPLACE INTO league_result(user_id,week,rank,from_level,to_level) VALUES(?,?,?,?,?)", (uid, last, i, lv, new))
    c.execute("INSERT OR REPLACE INTO meta(k,v) VALUES('settled',?)", (cur,))


def league_board(uid):
    with db() as c:
        c.execute("INSERT OR IGNORE INTO league(user_id,level) VALUES(?,0)", (uid,))
        _settle(c)
        members = _levels(c)
        level = dict(members).get(uid, 0)
        group = next(g for g in _groups(members)[level] if uid in g)
        wk = week_start()
        xp = {x["user_id"]: x["xp"] for x in c.execute("SELECT user_id,xp FROM xp WHERE week=?", (wk,))}
        names = {r["id"]: r["name"] for r in c.execute("SELECT id,name FROM users")}
        ranked = sorted(group, key=lambda u: (-xp.get(u, 0), u))
        last_wk = week_start(datetime.date.today() - datetime.timedelta(days=7))
        r = c.execute("SELECT * FROM league_result WHERE user_id=? AND week=?", (uid, last_wk)).fetchone()
        return {"leagues": LEAGUES, "level": level, "days_left": 7 - datetime.date.today().weekday(), "week": wk,
                "rows": [{"name": names[u], "xp": xp.get(u, 0), "me": u == uid} for u in ranked],
                "promote": PROMOTE, "demote": DEMOTE if level > 0 and len(ranked) >= 15 else 0,
                "last": ({"rank": r["rank"], "from": r["from_level"], "to": r["to_level"], "week": last_wk} if r else None)}
