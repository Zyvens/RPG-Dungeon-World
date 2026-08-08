(() => {
  'use strict';
  const load = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  load('./gameplay-legacy.js').then(() => load('./enhancements-v16.js')).catch(() => {});
})();