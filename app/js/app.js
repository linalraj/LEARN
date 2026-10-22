// Validate the server session before opening any protected student/staff screen.
// Old browser-only sessions used to bypass login and then trigger 401 errors on API requests.
(async function bootLearn(){
  try {
    if (S && S.user && API.token()) {
      const state = await API.state();
      if (!state || !state.user) throw new Error("Session is no longer valid");
      S.user = { ...state.user, id: state.user.id_number || state.user.id };
      if (typeof S.user.role === "string") S.user.role = S.user.role.toLowerCase();
      save();
      render();
      return;
    }
    if (S && S.user) { S.user = null; save(); }
    auth();
  } catch (e) {
    console.warn("LEARN session validation:", e);
    localStorage.removeItem("learn_token");
    if (S) { S.user = null; save(); }
    try { auth(); } catch (renderError) {
      console.error("LEARN startup failed:", renderError);
      const root = document.getElementById("app");
      if (root) root.innerHTML = `<main style="padding:24px;color:#1d1033;background:#fff;min-height:100%;font:15px system-ui"><h2 style="color:#c83d4d">LEARN could not start</h2><p style="margin:12px 0">A startup error stopped the app from loading.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f4f6;padding:12px;border-radius:10px">${String(renderError && renderError.message || renderError).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}</pre><button onclick="location.reload()" style="margin-top:14px;padding:12px 18px;border:0;border-radius:10px;background:#2a0b4d;color:#fff;font-weight:700">Reload app</button></main>`;
    }
  }
})();
