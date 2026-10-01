// Older org-roam-ui builds registered a service worker that cached every response, decrypted
// note text included. Browsers still running it fetch this file when they check for updates:
// clear its caches and unregister.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister()),
  )
})
