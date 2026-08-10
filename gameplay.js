(() => {
  'use strict';
  const load = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  load('./gameplay-legacy.js')
    .then(() => load('./enhancements-v17.js'))
    .then(() => load('./turns-basic-v22.js'))
    .then(() => load('./gameplay-spacing-v26.js'))
    .then(() => load('./progression-v32.js'))
    .then(() => load('./character-ui-fix-v31.js'))
    .then(() => load('./mobile-hud-safe-v32.js'))
    .catch(err => console.error('[Kael gameplay]', err));

  // Cloud sync is independent so Gameplay errors never block account/sync.
  load('./neon-sync-v3.js')
    .catch(err => console.error('[Kael Neon loader]', err));
})();