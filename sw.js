const CACHE_NAME = "kael-app-v4";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/kael-portrait.webp",
  "./assets/bg-winterfell.jpg",
  "./assets/weapon-presa-de-lofurin.webp",
  "./assets/shield-lobo-branco.webp",
  "./assets/armor-escamas.webp",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/favicon.png",
];

const NOTES_AUTOGROW_PATCH = `
;(() => {
  const fitGameNotes = () => {
    const notes = document.getElementById("gameNotes");
    if (!notes) return false;

    notes.style.overflowY = "hidden";
    notes.style.resize = "none";
    notes.style.height = "auto";

    const minHeight = Math.round(window.innerHeight * (window.innerWidth <= 760 ? 0.64 : 0.58));
    notes.style.height = Math.max(notes.scrollHeight, minHeight) + "px";

    if (!notes.dataset.autoGrowBound) {
      notes.dataset.autoGrowBound = "true";
      notes.addEventListener("input", fitGameNotes);
    }
    return true;
  };

  const ensureGameNotes = () => {
    if (fitGameNotes()) return;
    const observer = new MutationObserver(() => {
      if (fitGameNotes()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  ensureGameNotes();
  requestAnimationFrame(fitGameNotes);
  setTimeout(fitGameNotes, 100);
  setTimeout(fitGameNotes, 500);
  window.addEventListener("resize", fitGameNotes);
})();
`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Injeta a correção de autoaltura sem precisar alterar o app.js inteiro.
  if (url.pathname.endsWith("/app.js")) {
    event.respondWith(
      caches.match(event.request).then(async (cached) => {
        let response = cached;
        if (!response) {
          try {
            response = await fetch(event.request);
            if (response && response.ok && response.type === "basic") {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
          } catch (_) {}
        }

        if (!response) return new Response("", { status: 503 });
        const source = await response.clone().text();
        return new Response(source + NOTES_AUTOGROW_PATCH, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache"
          }
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});