// Client for the LEARN server in ../server (same address as the app).
// Same-origin by default, because the server also hosts the app.
const API = {
  base: "",
  token: () => localStorage.getItem("learn_token") || "",
  async call(method, path, body) {
    const r = await fetch(API.base + "/api" + path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + API.token() },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.detail || "Request failed");
    return j;
  },
  async login(email, password) { const j = await API.call("POST", "/login", { email, password }); localStorage.setItem("learn_token", j.token); return j.user; },
  register: (o) => API.call("POST", "/register", o),            // {email,password,name,id_number,phone,role}
  state: () => API.call("GET", "/state"),                        // {user, pr, pts, op}
  saveProgress: (course, kind, done, points) => API.call("POST", "/progress", { course, kind, done, points }),
  sendDoubt: (course, level, text) => API.call("POST", "/doubts", { course, level, text }),
  myDoubts: () => API.call("GET", "/doubts"),
  openLevels: (course, kind, count) => API.call("POST", "/open", { course, kind, count }),   // staff
  replyDoubt: (id, text) => API.call("POST", "/doubts/" + id + "/reply", { text }),          // staff
  lecture: (course, kind, idx) => API.call("GET", `/lectures/${encodeURIComponent(course)}/${kind}/${idx}`),
  // staff: send a lecture file; the server builds the Level game in the background (free AI or built-in generator)
  async uploadLecture(course, kind, idx, title, file) {
    const f = new FormData(); f.append("course", course); f.append("kind", kind); f.append("idx", idx); f.append("title", title); f.append("make_questions", "true"); f.append("file", file);
    const r = await fetch("/api/lectures/upload", { method: "POST", headers: { Authorization: "Bearer " + API.token() }, body: f });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.detail || "Upload failed"); return j;
  },
  gameStatus: (course, kind, idx) => API.call("GET", `/lectures/${encodeURIComponent(course)}/${kind}/${idx}/status`),
  regenerate: (course, kind, idx) => API.call("POST", `/lectures/${encodeURIComponent(course)}/${kind}/${idx}/regenerate`),
  addXp: (amount) => API.call("POST", "/xp", { amount }),
  league: () => API.call("GET", "/league"),
};
