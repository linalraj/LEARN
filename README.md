# LEARN v1.7.0

Learn · Practice · Grow. Student and staff app for the Department of Energy and Environmental Engineering, TNAU.

## Start the server (one time setup, then one command)

```
python -m pip install -r server\requirements.txt
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000
```
Run these inside the `learn` folder. Open `http://localhost:8000` on the laptop. Phones on the same Wi-Fi open
`http://<laptop-ip>:8000`. Everyone must use the same address, and log in once while the server is running
(that gives the account a server login, which games, XP and the league need).

Your accounts live in `server/learn.db`. This zip does not contain that file, so extracting over an old copy keeps them.

## Level games from lecture notes (free AI)

Staff: Resources > Add resource > choose the PPTX / PDF / DOCX / TXT file > course > Lecture Notes > pick the lecture > Save.
The server reads the file and builds the game in the background (about a minute). The row shows "Level N game ready".
Students then see it on that level: learning cards with pictures, skill check, sequence, then Duolingo-style exercises
(match pairs, listen, build the sentence, fill the blank, type, multiple choice, speak, true/false).

Pictures: images inside the teacher's slides/pages are used first; other cards get a free Wikipedia picture.
AI: copy `.env.example` to `.env` and paste a free Gemini key (https://aistudio.google.com). Groq, OpenRouter and a local
Ollama model also work. With no key, a built-in generator makes the game from the notes (simpler questions).
Scanned or image-only slides have no text to read; use a text-based file. Old `.ppt`/`.doc` files: save as `.pptx`/`.docx` first.
PDF files need `pypdf` (already in requirements.txt).

## League

Duolingo rules: 10 leagues (Bronze to Diamond), groups of up to 30 students, weekly XP (20 per level), top 10 move up,
bottom 5 move down (only in groups of 15 or more). The week resets every Monday.

## What is shared between devices and what is not

Shared through the server: accounts, level games and pictures, weekly XP and leagues.
Still saved only in each phone's own browser: classes, course materials list, messages and groups, doubts, assignments,
opened-level switches, progress and points. Staff and students on different phones therefore do not see each other's
messages or material lists yet. Moving these to the server is the next step before a full rollout.

## Appearance

Profile > Appearance: Light, Dark or Auto (follows the phone). Every screen has a Back button in the top bar.
