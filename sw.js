importScripts('./sw-legacy.js');

self.addEventListener('activate', event => {
  event.waitUntil(caches.delete('kael-app-v14'));
});