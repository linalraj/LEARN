"""LEARN server (FastAPI). Run from the learn/ folder:
      pip install -r server/requirements.txt
      uvicorn server.main:app --reload --host 0.0.0.0 --port 8000
Then open http://localhost:8000 (students/staff use the same address on your Wi-Fi: http://<laptop-ip>:8000).
The app files in ../app are served by this same server, so there is one thing to run.
"""
import os
import re
import shutil
import sys
import threading

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(__file__))  # lets "import models" work however uvicorn is started
import ai          # noqa: E402
import models      # noqa: E402
from schema import to_app_format  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS = os.path.join(ROOT, "uploads")
APP_DIR = os.path.join(ROOT, "app")
os.makedirs(UPLOADS, exist_ok=True)
models.init_db()

app = FastAPI(title="LEARN")


# ---------- auth helpers ----------
def current_user(authorization: str = Header(default="")):
    u = models.user_for_token(authorization.replace("Bearer ", "").strip())
    if not u:
        raise HTTPException(401, "Please log in")
    return u


def staff_user(u=Depends(current_user)):
    if u["role"] not in ("staff", "admin"):
        raise HTTPException(403, "Staff only")
    return u


def public(u):
    return {k: u[k] for k in ("id", "email", "name", "id_number", "phone", "role")}


# ---------- accounts ----------
class Register(BaseModel):
    email: str
    password: str
    name: str
    id_number: str
    phone: str
    role: str = "student"   # staff accounts should be approved by an admin in a real deployment


class Login(BaseModel):
    email: str
    password: str


@app.post("/api/register")
def register(b: Register):
    if not re.match(r"^\S+@\S+\.\S+$", b.email) or len(b.password) < 6:
        raise HTTPException(400, "Valid email and a password of 6+ characters are required")
    if b.role not in ("student", "staff"):
        raise HTTPException(400, "Role must be student or staff")
    if not models.create_user(b.email, b.password, b.name, b.id_number, b.phone, b.role):
        raise HTTPException(409, "Already registered. Please log in.")
    return {"ok": True}


@app.post("/api/login")
def login(b: Login):
    tok, u = models.login(b.email, b.password)
    if not tok:
        raise HTTPException(401, "Wrong email or password")
    return {"token": tok, "user": public(u)}


# ---------- progress & unlocking ----------
@app.get("/api/state")
def state(u=Depends(current_user)):
    """Everything the app needs at start: this user's progress + which levels faculty opened."""
    return {"user": public(u), **models.get_progress(u["id"]), "op": models.get_opened()}


class Progress(BaseModel):
    course: str
    kind: str      # "T" or "P"
    done: int      # levels completed so far
    points: int = 0


@app.post("/api/progress")
def progress(b: Progress, u=Depends(current_user)):
    models.set_progress(u["id"], b.course, b.kind, b.done, b.points)
    return {"ok": True}


class Open(BaseModel):
    course: str
    kind: str
    count: int


@app.post("/api/open")
def open_levels(b: Open, u=Depends(staff_user)):
    models.set_opened(b.course, b.kind, max(0, b.count))
    return {"ok": True}


# ---------- doubts ----------
class Doubt(BaseModel):
    course: str = ""
    level: str = ""
    text: str


@app.post("/api/doubts")
def new_doubt(b: Doubt, u=Depends(current_user)):
    return {"id": models.add_doubt(u["id"], b.course, b.level, b.text)}


@app.get("/api/doubts")
def doubts(u=Depends(current_user)):
    """Students see their own doubts with replies; staff see all."""
    return models.list_doubts(None if u["role"] in ("staff", "admin") else u["id"])


class Reply(BaseModel):
    text: str


@app.post("/api/doubts/{did}/reply")
def reply(did: int, b: Reply, u=Depends(staff_user)):
    if not models.reply_doubt(did, u["id"], b.text):
        raise HTTPException(404, "Doubt not found")
    return {"ok": True}


# ---------- lectures: upload -> free AI (or built-in generator) -> Level game for students ----------
JOBS = {}                         # (course|kind|idx) -> progress of the background generation
MEDIA = os.path.join(UPLOADS, "media")
os.makedirs(MEDIA, exist_ok=True)


def _key(course, kind, idx):
    return f"{course}|{kind}|{idx}"


def run_generation(course, kind, idx, title, path):
    """Runs in a background thread: read the file, ask the AI, add pictures, publish the game."""
    job = JOBS[_key(course, kind, idx)] = {"state": "working", "provider": "", "notes": [], "error": ""}
    try:
        folder = f"{course.replace(' ', '')}_{kind}{idx}"
        media_dir = os.path.join(MEDIA, folder)
        shutil.rmtree(media_dir, ignore_errors=True)
        source = ai.read_source(path, media_dir)
        lec, provider, notes = ai.generate_lecture(title, source)
        ai.attach_images(lec, source, media_dir, f"/media/{folder}/")
        models.save_lecture(course, kind, idx, content=lec, status="approved")
        job.update(state="done", provider=provider, notes=notes)
    except Exception as e:                       # keep the file; tell the teacher why no game was made
        job.update(state="error", error=str(e))


@app.post("/api/lectures/upload")
def upload(course: str = Form(...), kind: str = Form("T"), idx: int = Form(...), title: str = Form(""),
           make_questions: bool = Form(True), file: UploadFile = File(...), u=Depends(staff_user)):
    if kind not in ("T", "P") or idx < 0:
        raise HTTPException(400, "Bad lecture number")
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", file.filename or "notes.txt")
    path = os.path.join(UPLOADS, f"{course.replace(' ', '')}_{kind}{idx}_{safe}")
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    models.save_lecture(course, kind, idx, title=title or safe, notes_file=path)
    if not make_questions:
        return {"saved": True, "status": "none"}
    threading.Thread(target=run_generation, args=(course, kind, idx, title or os.path.splitext(safe)[0], path), daemon=True).start()
    return {"saved": True, "status": "working"}


@app.get("/api/lectures/{course}/{kind}/{idx}/status")
def lecture_status(course: str, kind: str, idx: int, u=Depends(staff_user)):
    lec = models.get_lecture(course, kind, idx)
    return {"job": JOBS.get(_key(course, kind, idx)), "ready": bool(lec and lec["content"] and lec["status"] == "approved")}


@app.post("/api/lectures/{course}/{kind}/{idx}/regenerate")
def regenerate(course: str, kind: str, idx: int, u=Depends(staff_user)):
    lec = models.get_lecture(course, kind, idx)
    if not lec or not lec["notes_file"] or not os.path.isfile(lec["notes_file"]):
        raise HTTPException(404, "Upload the lecture file first")
    threading.Thread(target=run_generation, args=(course, kind, idx, lec["title"] or "Lecture", lec["notes_file"]), daemon=True).start()
    return {"status": "working"}


@app.get("/api/lectures/{course}/{kind}/{idx}")
def lecture(course: str, kind: str, idx: int, u=Depends(current_user)):
    """Students get the published game in the app's own format. Staff also see the raw AI output."""
    lec = models.get_lecture(course, kind, idx)
    if not lec or not lec["content"] or lec["status"] != "approved":
        raise HTTPException(404, "No game for this lecture yet")
    if u["role"] == "student":
        return to_app_format(lec["content"])
    return {"status": lec["status"], "raw": lec["content"], "app": to_app_format(lec["content"])}


# ---------- weekly XP and leagues ----------
class Xp(BaseModel):
    amount: int


@app.post("/api/xp")
def add_xp(b: Xp, u=Depends(current_user)):
    models.add_xp(u["id"], max(0, min(b.amount, 500)))
    return {"ok": True}


@app.get("/api/league")
def league(u=Depends(current_user)):
    if u["role"] != "student":
        raise HTTPException(403, "Leagues are for students")
    return models.league_board(u["id"])


# ---------- serve the app (must be last so /api routes win) ----------
app.mount("/media", StaticFiles(directory=MEDIA), name="media")
app.mount("/", StaticFiles(directory=APP_DIR, html=True), name="app")
