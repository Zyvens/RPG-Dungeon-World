const CACHE_NAME = "kael-app-v5";
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

const UI_PATCH = `
;(() => {
  const injectPatchStyles = () => {
    if (document.getElementById("kael-v5-ui-patch")) return;
    const style = document.createElement("style");
    style.id = "kael-v5-ui-patch";
    style.textContent = \`
      /* Anotações gerais: cresce com o conteúdo e nunca cria scroll interno */
      .notes-card textarea#gameNotes {
        overflow-y: hidden !important;
        resize: none !important;
      }

      /* Personagens: lista vertical de largura total, não cards em grade */
      #dynamicPeopleGrid.people-grid,
      #dynamicPeopleGrid.dynamic-people {
        display: flex !important;
        flex-direction: column !important;
        grid-template-columns: none !important;
        gap: 0 !important;
        width: 100% !important;
      }

      #dynamicPeopleGrid .person {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 20px 0 !important;
        border: 0 !important;
        border-bottom: 1px solid rgba(193,154,91,.22) !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      #dynamicPeopleGrid .person:first-child {
        padding-top: 4px !important;
      }

      #dynamicPeopleGrid .person:last-child {
        border-bottom: 0 !important;
        padding-bottom: 6px !important;
      }

      #dynamicPeopleGrid .person-fields {
        display: grid !important;
        grid-template-columns: minmax(220px, 1fr) minmax(180px, .65fr) !important;
        gap: 10px 12px !important;
        width: 100% !important;
      }

      #dynamicPeopleGrid [data-person-key="name"] {
        grid-column: 1 !important;
        font-size: 1.05rem !important;
        font-weight: 700 !important;
      }

      #dynamicPeopleGrid [data-person-key="role"] {
        grid-column: 2 !important;
      }

      #dynamicPeopleGrid textarea[data-person-key="description"] {
        grid-column: 1 / -1 !important;
        width: 100% !important;
        min-height: 150px !important;
        line-height: 1.55 !important;
        resize: vertical !important;
      }

      #dynamicPeopleGrid .person-remove {
        top: 20px !important;
        right: 0 !important;
        z-index: 2 !important;
      }

      .character-actions {
        padding-top: 12px !important;
      }

      @media (max-width: 760px) {
        #dynamicPeopleGrid .person {
          padding: 18px 0 !important;
        }
        #dynamicPeopleGrid .person-fields {
          grid-template-columns: 1fr !important;
          gap: 9px !important;
        }
        #dynamicPeopleGrid [data-person-key="name"],
        #dynamicPeopleGrid [data-person-key="role"],
        #dynamicPeopleGrid textarea[data-person-key="description"] {
          grid-column: 1 !important;
        }
        #dynamicPeopleGrid [data-person-key="name"] {
          padding-right: 54px !important;
        }
        #dynamicPeopleGrid textarea[data-person-key="description"] {
          min-height: 180px !important;
        }
      }
    \`;
    document.head.appendChild(style);
  };

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

  const enhanceCharacters = () => {
    const grid = document.getElementById("dynamicPeopleGrid");
    if (!grid) return false;
    grid.querySelectorAll('textarea[data-person-key="description"]').forEach((area) => {
      if (!area.dataset.largeNotes) {
        area.dataset.largeNotes = "true";
        area.setAttribute("rows", window.innerWidth <= 760 ? "7" : "6");
      }
    });
    return true;
  };

  const apply = () => {
    injectPatchStyles();
    fitGameNotes();
    enhanceCharacters();
  };

  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  requestAnimationFrame(apply);
  setTimeout(apply, 100);
  setTimeout(apply, 500);
  window.addEventListener("resize", apply);
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
        return new Response(source + UI_PATCH, {
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