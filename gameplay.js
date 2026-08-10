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
    .catch(err => console.error('[Kael gameplay]', err));

  // Cloud sync is intentionally independent so a Gameplay error never blocks auth/sync.
  load('./neon-sync-v2.js')
    .catch(err => console.error('[Kael Neon loader]', err));
})();