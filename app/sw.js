// LEARN service worker: network first, cache as fallback, so students get new files when online
// and the app still opens offline. version.json is never cached (the "update available" banner reads it).
const CACHE = "learn-shell-v6";
const SHELL = ["./", "index.html", "css/style.css", "manifest.json", "data/syllabus.json",
  "js/config.js","js/api.js","js/syllabus.js","js/brand.js","js/state.js","js/auth.js","js/home.js","js/chat.js","js/course.js",
  "js/map.js","js/lesson-data.js","js/lesson.js","js/staff.js","js/tabs.js","js/app.js",
  "icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.endsWith("version.json")) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
